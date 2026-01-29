function payfast(data){
    data.payment_status="COMPLETE";
    data.status=true
    return data
}

module.exports={payfast};
// brandify.js
// Simple functions to generate brand-name variants from English words/phrases.
// Drop into Node or a frontend dev tool.

// const transformations = {
//   vowelSwap: w => w.replace(/[aeiou]{1,2}/gi, m => {
//     const map = { a:'o', e:'i', i:'e', o:'a', u:'o' };
//     return map[m.toLowerCase()] || m;
//   }),
//   removeVowels: w => w.replace(/[aeiou]/gi, ''),
//   simplify: w => w.replace(/ph/gi,'f').replace(/ck/gi,'k').replace(/c(?!h)/gi,'k'),
//   zReplace: w => w.replace(/s/gi,'z'),
//   doubleFirstConsonant: w => w.replace(/^([bcdfghjklmnpqrstvwxyz])/, '$1$1'),
//   appendSuffix: (w,s) => `${w}${s}`,
//   injectNumber: (w,n) => `${w}${n}`,
//   shorten: w => w.slice(0, Math.max(3, Math.min(6, w.length))),
//   vowelLengthen: w => w.replace(/([aeiou])/i, '$1$1')
// };

// function seedify(phrase){
//   return phrase.toLowerCase()
//     .replace(/[^a-z0-9\s]/g,'') // strip punctuation
//     .replace(/\s+/g,' ');
// }

// function generateVariants(phrase, options = {}) {
//   const base = seedify(phrase);
//   const parts = base.split(' ');
//   const first = parts[0] || base;
//   const second = parts[1] || '';

//   const pool = new Set();

//   // direct playful
//   pool.add(first);
//   pool.add(`${first}it`);
//   pool.add(transformations.doubleFirstConsonant(first));
//   pool.add(transformations.simplify(first));
//   pool.add(transformations.vowelSwap(first));
//   pool.add(transformations.vowelLengthen(first));
//   pool.add(transformations.removeVowels(first));
//   pool.add(transformations.zReplace(first));
//   pool.add(transformations.appendSuffix(first,'io'));
//   pool.add(transformations.appendSuffix(first,'ly'));
//   pool.add(transformations.appendSuffix(first,'er'));
//   pool.add(transformations.appendSuffix(first,'o'));
//   pool.add(transformations.injectNumber(first, Math.floor(Math.random()*9)+1));
//   if(second){
//     pool.add(first + second.slice(0,3));
//     pool.add(first + second[0]);
//     pool.add(first + second.slice(0,2) + 'o');
//     pool.add(first + second.slice(0,2) + 'mo');
//   }

//   // shorten + suffix combos
//   const s = transformations.shorten(first);
//   pool.add(s);
//   pool.add(s + 'r');
//   pool.add(s + 'ly');
//   pool.add(s + 'io');

//   // fallback safe options
//   pool.add(first.replace(/c/gi,'k'));
//   pool.add(first.replace(/g/gi,'j'));

//   // return array
//   return Array.from(pool).filter(Boolean);
// }

// console.log(generateVariants("Cook it"));
// console.log(generateVariants("for better"));
// console.log(generateVariants("Way more"));

