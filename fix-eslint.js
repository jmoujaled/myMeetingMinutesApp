#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix common ESLint issues
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix unused imports - remove NextRequest if not used
  if (content.includes('import { NextRequest,') && !content.includes('NextRequest') && !content.includes('request: NextRequest')) {
    content = content.replace(/import \{ NextRequest,\s*([^}]+)\s*\}/g, 'import { $1 }');
    modified = true;
  }

  // Fix unused imports - remove NextResponse if not used  
  if (content.includes('import { NextResponse') && !content.includes('NextResponse.json') && !content.includes('return NextResponse')) {
    content = content.replace(/import \{ ([^,]+),\s*NextResponse\s*\}/g, 'import { $1 }');
    content = content.replace(/import \{ NextResponse\s*\}/g, '');
    modified = true;
  }

  // Fix unused parameters - replace with underscore
  content = content.replace(/\(([^)]*)\s+request\s*:\s*[^)]+\)\s*=>/g, (match, before) => {
    if (!content.includes('request.')) {
      return match.replace('request', '_request');
    }
    return match;
  });

  // Fix unused variables in catch blocks
  content = content.replace(/catch\s*\(\s*err\s*[^)]*\)\s*{/g, 'catch {');
  content = content.replace(/catch\s*\(\s*e\s*[^)]*\)\s*{/g, 'catch {');

  // Fix prefer-const issues
  content = content.replace(/let\s+(\w+)\s*=\s*([^;]+);/g, (match, varName, value) => {
    // Simple heuristic: if the variable is not reassigned later, make it const
    const regex = new RegExp(`\\b${varName}\\s*=`, 'g');
    const matches = content.match(regex);
    if (matches && matches.length === 1) {
      return `const ${varName} = ${value};`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

// List of files to fix
const filesToFix = [
  'src/app/api/context-transcribe/route.ts',
  'src/app/api/debug/meetings/route.ts',
  'src/app/api/debug/transcript-data/route.ts',
  'src/app/api/debug/user-profile/route.ts',
  'src/app/api/meetings/search/content/route.ts',
  'src/app/api/meetings/search/suggestions/route.ts',
  'src/app/api/meetings-simple/route.ts',
  'src/app/api/usage/analytics/route.ts',
  'src/app/api/usage/reset/route.ts',
  'src/app/api/user/profile/route.ts',
  'src/app/reset-password/page.tsx',
  'src/app/verify-email/page.tsx',
  'src/components/auth/LoginForm.tsx',
  'src/components/auth/RegisterForm.tsx',
  'src/app/debug-user-data/page.tsx',
  'src/components/ui/PerformanceMonitor.tsx'
];

filesToFix.forEach(fixFile);

console.log('ESLint fixes completed!');