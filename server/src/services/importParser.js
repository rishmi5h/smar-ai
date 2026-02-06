import path from 'path';

// Parse import statements from a file based on its extension
export const parseImports = (filePath, content) => {
  const ext = path.extname(filePath).toLowerCase();
  const imports = [];

  if (!content || typeof content !== 'string') return imports;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    let importPath = null;

    // JavaScript / TypeScript
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      // import ... from '...' (single-line)
      const esMatch = trimmed.match(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (esMatch) importPath = esMatch[1];

      // } from '...' (multi-line import closing)
      const multiLineMatch = trimmed.match(/^}\s*from\s+['"]([^'"]+)['"]/);
      if (multiLineMatch) importPath = multiLineMatch[1];

      // import '...' (side-effect import)
      const sideMatch = trimmed.match(/^import\s+['"]([^'"]+)['"]/);
      if (sideMatch) importPath = sideMatch[1];

      // export ... from '...'
      const reExportMatch = trimmed.match(/^export\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (reExportMatch) importPath = reExportMatch[1];

      // require('...')
      const requireMatch = trimmed.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch && !importPath) importPath = requireMatch[1];
    }

    // Python
    if (['.py'].includes(ext)) {
      const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import/);
      if (fromMatch) importPath = fromMatch[1];

      const importMatch = trimmed.match(/^import\s+([\w.]+)/);
      if (importMatch && !fromMatch) importPath = importMatch[1];
    }

    // Go
    if (['.go'].includes(ext)) {
      const goMatch = trimmed.match(/^\s*"([^"]+)"/);
      if (goMatch) importPath = goMatch[1];
    }

    // Java
    if (['.java'].includes(ext)) {
      const javaMatch = trimmed.match(/^import\s+([\w.*]+);/);
      if (javaMatch) importPath = javaMatch[1];
    }

    // Rust
    if (['.rs'].includes(ext)) {
      const rustMatch = trimmed.match(/^use\s+([\w:]+)/);
      if (rustMatch) importPath = rustMatch[1];
    }

    if (importPath) {
      imports.push(importPath);
    }
  }

  return imports;
};

// Resolve a relative import path against the importing file's directory
const resolveImport = (fromFile, importPath, allFilePaths) => {
  // Skip external/package imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return { resolved: importPath, isExternal: true };
  }

  const dir = path.dirname(fromFile);
  let resolved = path.normalize(path.join(dir, importPath));

  // Try to match with known file paths (with or without extension)
  const match = allFilePaths.find(f =>
    f === resolved ||
    f.startsWith(resolved + '.') ||
    f === resolved + '/index.js' ||
    f === resolved + '/index.ts' ||
    f === resolved + '/index.jsx' ||
    f === resolved + '/index.tsx'
  );

  return { resolved: match || resolved, isExternal: false };
};

// Build a dependency graph from code snippets
export const buildDependencyGraph = (codeSnippets) => {
  const allFilePaths = codeSnippets.map(s => s.path);
  const nodes = [];
  const edges = [];
  const externalDeps = new Set();
  const nodeIds = new Set();

  for (const snippet of codeSnippets) {
    const group = path.dirname(snippet.path) || 'root';
    const label = path.basename(snippet.path);

    if (!nodeIds.has(snippet.path)) {
      nodes.push({ id: snippet.path, label, group });
      nodeIds.add(snippet.path);
    }

    const imports = parseImports(snippet.path, snippet.content);

    for (const imp of imports) {
      const { resolved, isExternal } = resolveImport(snippet.path, imp, allFilePaths);

      if (isExternal) {
        // Track external dependency name (first segment)
        const pkgName = resolved.split('/')[0].replace(/^@/, () => '@' + resolved.split('/')[1]);
        externalDeps.add(resolved.split('/')[0]);
      } else {
        // Only add edge if target file exists in our snippet set
        if (allFilePaths.some(f => f === resolved || f.startsWith(resolved))) {
          const targetPath = allFilePaths.find(f => f === resolved || f.startsWith(resolved + '.') || f === resolved + '/index.js');
          if (targetPath && targetPath !== snippet.path) {
            edges.push({ from: snippet.path, to: targetPath });

            // Ensure target node exists
            if (!nodeIds.has(targetPath)) {
              const targetGroup = path.dirname(targetPath) || 'root';
              nodes.push({ id: targetPath, label: path.basename(targetPath), group: targetGroup });
              nodeIds.add(targetPath);
            }
          }
        }
      }
    }
  }

  return {
    nodes,
    edges,
    externalDeps: [...externalDeps].sort()
  };
};

// Generate Mermaid DSL from the dependency graph
export const generateMermaidDSL = (graph) => {
  const { nodes, edges } = graph;

  if (nodes.length === 0) {
    return 'graph LR\n  empty[No dependencies found]';
  }

  // Group nodes by directory
  const groups = {};
  for (const node of nodes) {
    const group = node.group === '.' ? 'root' : node.group;
    if (!groups[group]) groups[group] = [];
    groups[group].push(node);
  }

  // Sanitize ID for Mermaid (replace special chars)
  const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');

  let dsl = 'graph LR\n';

  // Add subgraphs for each directory group
  for (const [group, groupNodes] of Object.entries(groups)) {
    const groupLabel = group === 'root' ? 'Root' : group;
    dsl += `  subgraph ${sanitizeId(group)}["${groupLabel}"]\n`;
    for (const node of groupNodes) {
      dsl += `    ${sanitizeId(node.id)}["${node.label}"]\n`;
    }
    dsl += '  end\n';
  }

  // Add edges
  for (const edge of edges) {
    dsl += `  ${sanitizeId(edge.from)} --> ${sanitizeId(edge.to)}\n`;
  }

  return dsl;
};
