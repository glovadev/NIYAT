const fs = require('fs');
['f.startsWith(\'console.\')', 'fs.unlinkSync(f))', 'scripts/check-product-images.ts'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});
fs.unlinkSync(__filename);
