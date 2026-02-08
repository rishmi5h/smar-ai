// Impact Graph Builder — generates a Mermaid diagram showing
// how changed files relate to each other via import dependencies

import path from 'path';
import { parseImports } from './importParser.js';

/**
 * Sanitize a file path for use as a Mermaid node ID
 */
const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');

/**
 * Get a short display label for a file
 */
const getLabel = (filePath) => path.basename(filePath);

/**
 * Get the status color class for Mermaid styling
 */
const getStatusStyle = (status) => {
  switch (status) {
    case 'added': return 'fill:#22c55e,stroke:#16a34a,color:#fff';
    case 'removed': return 'fill:#ef4444,stroke:#dc2626,color:#fff';
    case 'modified': return 'fill:#f59e0b,stroke:#d97706,color:#fff';
    case 'renamed': return 'fill:#8b5cf6,stroke:#7c3aed,color:#fff';
    default: return 'fill:#4f7cff,stroke:#3b6af5,color:#fff';
  }
};

/**
 * Build an impact graph showing changed files and their relationships
 * @param {Array} changedFiles - Files from compare API with {filename, status, additions, deletions, patch}
 * @param {Array} codeSnippets - Code snippets at HEAD ref with {path, content}
 * @returns {{ mermaidDSL: string, stats: object }}
 */
export const buildImpactGraph = (changedFiles, codeSnippets) => {
  if (!changedFiles || changedFiles.length === 0) {
    return {
      mermaidDSL: 'graph LR\n  empty["No file changes to visualize"]',
      stats: { directChanges: 0, rippleAffected: 0, connections: 0 }
    };
  }

  const changedFileSet = new Set(changedFiles.map(f => f.filename));
  const fileStatusMap = {};
  for (const f of changedFiles) {
    fileStatusMap[f.filename] = f.status;
  }

  // Parse imports from all available code snippets (not just changed files)
  // to find "ripple effect" — unchanged files that import changed files
  const allImports = {};
  for (const snippet of codeSnippets) {
    const imports = parseImports(snippet.path, snippet.content);
    allImports[snippet.path] = imports;
  }

  // Build edges: file A imports file B
  const edges = [];
  const rippleFiles = new Set(); // unchanged files that import changed files

  for (const [importerPath, imports] of Object.entries(allImports)) {
    for (const imp of imports) {
      // Skip external packages
      if (!imp.startsWith('.') && !imp.startsWith('/')) continue;

      // Resolve the import path
      const dir = path.dirname(importerPath);
      let resolvedBase = path.normalize(path.join(dir, imp));

      // Try to match against known files (with or without extension)
      const allPaths = codeSnippets.map(s => s.path);
      const resolved = allPaths.find(f =>
        f === resolvedBase ||
        f.startsWith(resolvedBase + '.') ||
        f === resolvedBase + '/index.js' ||
        f === resolvedBase + '/index.ts' ||
        f === resolvedBase + '/index.jsx' ||
        f === resolvedBase + '/index.tsx'
      );

      if (!resolved) continue;

      const importerChanged = changedFileSet.has(importerPath);
      const importeeChanged = changedFileSet.has(resolved);

      // Only include edges that involve at least one changed file
      if (importerChanged || importeeChanged) {
        edges.push({ from: importerPath, to: resolved });

        // Track ripple: unchanged file that imports a changed file
        if (!importerChanged && importeeChanged) {
          rippleFiles.add(importerPath);
        }
        if (importerChanged && !importeeChanged) {
          rippleFiles.add(resolved);
        }
      }
    }
  }

  // Group changed files by directory
  const groups = {};
  const allNodes = new Set();

  for (const file of changedFiles) {
    const group = path.dirname(file.filename) || 'root';
    if (!groups[group]) groups[group] = [];
    groups[group].push(file.filename);
    allNodes.add(file.filename);
  }

  // Add ripple files (limit to top 5 to avoid clutter)
  const rippleArray = [...rippleFiles].slice(0, 5);
  for (const rf of rippleArray) {
    const group = path.dirname(rf) || 'root';
    if (!groups[group]) groups[group] = [];
    if (!groups[group].includes(rf)) groups[group].push(rf);
    allNodes.add(rf);
  }

  // Generate Mermaid DSL
  let dsl = 'graph LR\n';

  // Add subgraphs for each directory
  for (const [group, files] of Object.entries(groups)) {
    const groupLabel = group === '.' ? 'Root' : group;
    dsl += `  subgraph ${sanitizeId(group)}["${groupLabel}"]\n`;
    for (const file of files) {
      const label = getLabel(file);
      const isRipple = rippleFiles.has(file);
      if (isRipple) {
        dsl += `    ${sanitizeId(file)}["${label} ⟡"]:::ripple\n`;
      } else {
        dsl += `    ${sanitizeId(file)}["${label}"]\n`;
      }
    }
    dsl += '  end\n';
  }

  // Add edges
  const addedEdges = new Set();
  for (const edge of edges) {
    if (!allNodes.has(edge.from) || !allNodes.has(edge.to)) continue;
    const edgeKey = `${edge.from}->${edge.to}`;
    if (addedEdges.has(edgeKey)) continue;
    addedEdges.add(edgeKey);
    dsl += `  ${sanitizeId(edge.from)} --> ${sanitizeId(edge.to)}\n`;
  }

  // Add style classes
  for (const file of changedFiles) {
    const status = file.status;
    dsl += `  style ${sanitizeId(file.filename)} ${getStatusStyle(status)}\n`;
  }

  // Style ripple files differently
  dsl += `  classDef ripple fill:#1e293b,stroke:#64748b,stroke-dasharray:5 5,color:#94a3b8\n`;

  const stats = {
    directChanges: changedFiles.length,
    rippleAffected: rippleFiles.size,
    connections: addedEdges.size,
    addedFiles: changedFiles.filter(f => f.status === 'added').length,
    modifiedFiles: changedFiles.filter(f => f.status === 'modified').length,
    deletedFiles: changedFiles.filter(f => f.status === 'removed').length,
    renamedFiles: changedFiles.filter(f => f.status === 'renamed').length
  };

  return { mermaidDSL: dsl, stats };
};
