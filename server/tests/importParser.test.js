import { describe, it, expect } from 'vitest';
import { parseImports, buildDependencyGraph, generateMermaidDSL } from '../src/services/importParser.js';

describe('importParser', () => {
  describe('parseImports', () => {
    // JavaScript/TypeScript
    it('parses ES module imports', () => {
      const content = `import express from 'express';\nimport { useState } from 'react';`;
      const imports = parseImports('src/app.js', content);
      expect(imports).toContain('express');
      expect(imports).toContain('react');
    });

    it('parses require() calls', () => {
      const content = `const fs = require('fs');\nconst path = require('path');`;
      const imports = parseImports('src/app.js', content);
      expect(imports).toContain('fs');
      expect(imports).toContain('path');
    });

    it('parses relative imports', () => {
      const content = `import handler from './handler';\nimport utils from '../utils';`;
      const imports = parseImports('src/app.js', content);
      expect(imports).toContain('./handler');
      expect(imports).toContain('../utils');
    });

    it('parses side-effect imports', () => {
      const content = `import './styles.css';`;
      const imports = parseImports('src/app.js', content);
      expect(imports).toContain('./styles.css');
    });

    it('parses re-exports', () => {
      const content = `export { default } from './component';`;
      const imports = parseImports('src/index.js', content);
      expect(imports).toContain('./component');
    });

    it('works with .tsx files', () => {
      const content = `import React from 'react';\nimport App from './App';`;
      const imports = parseImports('src/index.tsx', content);
      expect(imports).toContain('react');
      expect(imports).toContain('./App');
    });

    // Python
    it('parses Python from...import', () => {
      const content = `from flask import Flask\nfrom utils.helpers import format_date`;
      const imports = parseImports('app.py', content);
      expect(imports).toContain('flask');
      expect(imports).toContain('utils.helpers');
    });

    it('parses Python import', () => {
      const content = `import os\nimport json`;
      const imports = parseImports('app.py', content);
      expect(imports).toContain('os');
      expect(imports).toContain('json');
    });

    // Go
    it('parses Go imports', () => {
      const content = `import (\n\t"fmt"\n\t"net/http"\n)`;
      const imports = parseImports('main.go', content);
      expect(imports).toContain('fmt');
      expect(imports).toContain('net/http');
    });

    // Java
    it('parses Java imports', () => {
      const content = `import java.util.List;\nimport com.example.MyClass;`;
      const imports = parseImports('App.java', content);
      expect(imports).toContain('java.util.List');
      expect(imports).toContain('com.example.MyClass');
    });

    // Rust
    it('parses Rust use statements', () => {
      const content = `use std::io;\nuse serde::Deserialize;`;
      const imports = parseImports('main.rs', content);
      expect(imports).toContain('std::io');
      expect(imports).toContain('serde::Deserialize');
    });

    // Edge cases
    it('returns empty array for empty content', () => {
      expect(parseImports('test.js', '')).toEqual([]);
    });

    it('returns empty array for null content', () => {
      expect(parseImports('test.js', null)).toEqual([]);
    });

    it('returns empty array for non-string content', () => {
      expect(parseImports('test.js', 123)).toEqual([]);
    });

    it('returns empty array for unsupported file type', () => {
      const content = 'import something from "somewhere"';
      expect(parseImports('test.txt', content)).toEqual([]);
    });
  });

  describe('buildDependencyGraph', () => {
    it('returns correct structure', () => {
      const snippets = [
        { path: 'src/index.js', content: `import app from './app';` },
        { path: 'src/app.js', content: `import express from 'express';` }
      ];
      const graph = buildDependencyGraph(snippets);
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph).toHaveProperty('externalDeps');
    });

    it('creates nodes for files', () => {
      const snippets = [
        { path: 'src/a.js', content: 'const x = 1;' },
        { path: 'src/b.js', content: 'const y = 2;' }
      ];
      const graph = buildDependencyGraph(snippets);
      expect(graph.nodes.length).toBe(2);
    });

    it('tracks external dependencies', () => {
      const snippets = [
        { path: 'src/app.js', content: `import express from 'express';\nimport cors from 'cors';` }
      ];
      const graph = buildDependencyGraph(snippets);
      expect(graph.externalDeps).toContain('express');
      expect(graph.externalDeps).toContain('cors');
    });

    it('creates edges for relative imports', () => {
      const snippets = [
        { path: 'src/index.js', content: `import handler from './handler.js';` },
        { path: 'src/handler.js', content: 'export default function() {}' }
      ];
      const graph = buildDependencyGraph(snippets);
      expect(graph.edges.length).toBeGreaterThanOrEqual(1);
      expect(graph.edges[0].from).toBe('src/index.js');
      expect(graph.edges[0].to).toBe('src/handler.js');
    });

    it('handles empty snippets', () => {
      const graph = buildDependencyGraph([]);
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.externalDeps).toHaveLength(0);
    });
  });

  describe('generateMermaidDSL', () => {
    it('generates valid mermaid DSL', () => {
      const graph = {
        nodes: [
          { id: 'src/a.js', label: 'a.js', group: 'src' },
          { id: 'src/b.js', label: 'b.js', group: 'src' }
        ],
        edges: [{ from: 'src/a.js', to: 'src/b.js' }],
        externalDeps: []
      };
      const dsl = generateMermaidDSL(graph);
      expect(dsl).toContain('graph LR');
      expect(dsl).toContain('-->');
    });

    it('handles empty graph', () => {
      const graph = { nodes: [], edges: [], externalDeps: [] };
      const dsl = generateMermaidDSL(graph);
      expect(dsl).toContain('graph LR');
      expect(dsl).toContain('No dependencies found');
    });

    it('groups nodes by directory', () => {
      const graph = {
        nodes: [
          { id: 'src/a.js', label: 'a.js', group: 'src' },
          { id: 'lib/b.js', label: 'b.js', group: 'lib' }
        ],
        edges: [],
        externalDeps: []
      };
      const dsl = generateMermaidDSL(graph);
      expect(dsl).toContain('subgraph');
      expect(dsl).toContain('src');
      expect(dsl).toContain('lib');
    });
  });
});
