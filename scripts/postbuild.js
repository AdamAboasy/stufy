import fs from 'fs';

if (fs.existsSync('dist')) {
  try {
    if (!fs.existsSync('.next')) {
      fs.cpSync('dist', '.next', { recursive: true });
    }
  } catch (err) {
    // Ignore any non-critical copy error
  }
}
