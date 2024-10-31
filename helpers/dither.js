// program to detect which colors could be optically combined to resemble the given color / output dithering
// const fs = require('fs');
const Jimp = require('jimp');

// https://colors.dopely.top/color-mixer/
// https://convertingcolors.com/

function rgb2hsv(r, g, b, round) {
  // source: https://stackoverflow.com/a/54070620 (with some alterations)
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let d = max-min; // distance between max and min value
  
  let h = d && ((max === r) ? (g - b) / d : ((max === g) ? 2 + (b - r)/d : 4 + (r - g)/d));
  if (h < 0) h += 6;
  h *= 60;
  let s = max === 0 ? 0 : d/max;
  let v = max/255;
  // let v = Math.max(r,g,b), c = v-Math.min(r,g,b);
  // let h = c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c));
  // let s = v && c / v;
  // v /= 255; //convert to decimal percentage
  // console.log(v && c / v);
  // let hsv = [60*(h<0?h+6:h), v&&c/v, v];

  if (round) return [Math.round(h), Number(s.toFixed(2)), Number(v.toFixed(2))]; //return hsv.map(val => Math.round(val));
  else return [h, s, v];
}


/*
function rgb2hsv_old(r, g, b) {
  // source: https://gist.github.com/mjackson/5311256
  r /= 255, g /= 255, b /= 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;

  let d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, v];  
}
*/


function hsv2rgb(h, s, v) {
  // source: https://gist.github.com/mjackson/5311256

  if (h > 1) h/=360; //new
  let r, g, b;

  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [r, g, b].map(val => Math.round(val*255));
  // return [r*255, g * 255, b * 255 ];
}


function readImg(fp) {
  console.log('TODO');
}


function getColors(img) {
  console.log('TODO');
}


// function getSumSubsets(val) {
//   console.log(typeof val, val %1);
//   if (val % 1) val = Math.round(val);
//   let range = [...Array(val+1).keys()];
//   let combos = [];

//   for (let n of range) {
//     let c = (2*val)-n; // complimentary color
//     // let subset = [n, val-n];
//     combos.push([n, c]);
//     range.splice(range.indexOf(c), 1);
//   }
  
//   return combos;
// }

function range({start=0, stop, len, step}) {
  if (len) {
    if (step) return Array.from(new Array(len), (_, i) => (i*step)+start);
    else return Array.from(new Array(len), (_, i) => i + start);
  }
  else {
    if (step) return Array.from(new Array(Math.ceil((stop-start)/step)), (_, i) => (i*step)+start);
    return Array.from(new Array(stop-start), (_, i) => i + start);
  }
  // Array.from(new Array(Math.ceil(len/incr)), (_, i) => i*incr);
}


function getMax(arr) {
  // let len = arr.length;
  let max = -Infinity;
  for (let i=0; i<arr.length; ++i) {
    max = arr[i] > max ? arr[i] : max;
  }
  return max;
}


function getMin(arr) {
  // let len = arr.length;
  let min = Infinity;
  for (let i=0; i<arr.length; ++i) {
    min = arr[i] < min ? arr[i] : min;
  }
  return min;
}


function closestCol(arr, col) {
  let min_d = Infinity;
  let c;
  let idx;
  for (let i=0; i<arr.length; ++i) {
    let val = arr[i];
    let d = val.map((v, i) => Math.abs(v-col[i])).reduce((a, b) => a + b, 0);
    if (d < min_d) {
      min_d = d;
      c = val;
      idx = i;
    }
  }
  // let red_dist_0 = arr.map(val => Math.abs(val[0]-255));
  return [c, idx];
}


function closestColPair(arr, col) {
  let min_d = Infinity;
  let c;
  let idx;
  for (let i=0; i<arr.length; ++i) {
    let vals = arr[i];
    let d0 = vals[0].map((v, i) => Math.abs(v-col[i])).reduce((a, b) => a + b, 0);
    let d1 = vals[1].map((v, i) => Math.abs(v-col[i])).reduce((a, b) => a + b, 0);
    let d = Math.min(d0, d1);
    if (d < min_d) {
      min_d = d;
      // if (d === d0) c = vals[0];
      // else c = vals[1];
      // c = val;
      idx = i;
    }
  }
  // let red_dist_0 = arr.map(val => Math.abs(val[0]-255));
  return arr[idx];
}


function rgbMix(col, additive) { // rgb is additive
  let [R, G, B] = col;
  let combos = [];

  // let leq_combos = []; // less than or equal to combos
  
  // let leq_r = [...Array(R+1).keys()];
  // let leq_g = [...Array(G+1).keys()];
  // let leq_b = [...Array(B+1).keys()];

  /*
  let gt_combos = []; // greater than combos
  let gt_r = range({start:R+1, stop:255+1});
  let gt_g = range({start:G+1, stop:255+1});
  let gt_b = range({start:B+1, stop:255+1});
  */

  // source: https://stackoverflow.com/a/56457120
  if (additive) { // Additive mixing (good for light sources)
    // additive logic: col = c1+c2 => c2 = col-c1
    // c1 <= col, so get the less than or equal to combos:
    let leq_r = range({len:R+1});
    let leq_g = range({len:G+1});
    let leq_b = range({len:B+1});

    // now get all the combos with the leq cols and their complementary cols:
    for (let r of leq_r) {
      for (let g of leq_g) {
        for (let b of leq_b) {
          let leq = [r, g, b];
          let c = col.map((v, i) => v-leq[i]); // complementary color
          combos.push([leq, c]);
          // leq_combos.push([r, g, b]);
        }
      }
    }

    /*
    // get all the combos of rgb vals that are gt col:
    for (let r of gt_r) {
      for (let g of gt_g) {
        for (let b of gt_b) {
          gt_combos.push([r, g, b]);
        }
      }
    }
    */

    // now get all the combos:


    // to be able to mix up to c0 the c1 must be less or equal to c0 on per channel bases. So for example random lesser color:

  } else { // Subtractive mixing (good filters, paint colors)
    // subtractive logic: col = c1-c2 => c2 = c1-col
    // c1 >= col, so get the greater than or equal to combos:
    let geq_r = range({start:R, stop:255+1});
    let geq_g = range({start:G, stop:255+1});
    let geq_b = range({start:B, stop:255+1});

    // now get all the combos with the geq cols and their complementary cols:
    for (let r of geq_r) {
      for (let g of geq_g) {
        for (let b of geq_b) {
          let geq = [r, g, b];
          let c = geq.map((v, i) => v-col[i]); // complementary color
          combos.push([geq, c]);
          // leq_combos.push([r, g, b]);
        }
      }
    }
  }

	// console.log(typeof val, val % 1);
	// if (val % 1) val = Math.round(val);
	// let range = [...Array(val + 1).keys()];
	// let combos = [];
	
	// for (let n of range) {
	// 	let c = (2 * val) - n; // complimentary color
	// 	// let subset = [n, val-n];
	// 	combos.push([n, c]);
	// 	range.splice(range.indexOf(c), 1);
	// }
	
	return combos;
}

// (a+b)/2 = x
// 2x = a+b
// (2x)-a = b
// red: 0, 100, 100
// green: 120, 100, 100
// red+green: 58, 100, 46

function ditherOpts(col) {
  let [r, g, b] = col;
  let hsv = rgb2hsv(col);

  let col_combos = getSumSubsets(hsv[0]);

}

// let rgb = [243, 10, 53];
// let hsv = rgb2hsv(...[243, 10, 53]);
// console.log(hsv);
// // console.log(rgb2hsv_old(243, 10, 53, true));
// // console.log(hsv2rgb(...hsv));
// console.log(hsv2rgb(...hsv));
// console.log(hsv2rgb(...rgb2hsv_old(...rgb)));
// console.log(hsv2rgb(rgb2hsv(243, 10, 53)));

// console.log(getSumSubsets(hsv[0]));


// rgb = [118, 115, 0];
// let combos_add = rgbMix(rgb, true);
// let combos_sub = rgbMix(rgb, false);

// let red_dist_0 = combos_sub.map(val => Math.abs(val[0][0]-255));
// let red_dist_1 = combos_sub.map(val => Math.abs(val[1][0]-255));

// let red_closest_0 = combos_sub[red_dist_0.indexOf(getMin(red_dist_0))];
// let red_closest_1 = combos_sub[red_dist_1.indexOf(getMin(red_dist_1))];

// let [closest, idx] = closestCol(combos_sub.map(el => el[0]), [255, 0, 0]);

// console.log(closest, combos_sub[idx]);
// console.log(closestCol(combos_sub.map(el => el[1]), [255, 0, 0]));
// console.log(getSumSubsets(10));
// convert colors to CMYK
// half-tone filter //?

// def rgb2hsv(px):
//   rgb = np.broadcast_to(px, (1,1,3)).astype('uint8')
//   print(rgb)
//   bgr = rgb[:,:,::-1]
//   print(bgr)
//   hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
//   print(hsv)
//   return hsv
// // array([[[174, 244, 243]]], dtype=uint8)



function rgb2xyz(r, g, b) {
  // source: https://stackoverflow.com/a/73998199
  let [R, G, B] = [r, g, b]
  .map(x => x / 255)
  .map(x => x > 0.04045
    ? Math.pow(((x + 0.055) / 1.055), 2.4)
    : x / 12.92)
  .map(x => x * 100);

  // Observer. = 2°, Illuminant = D65
  let x = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  return [x, y, z];
}


function xyz2rgb(x, y, z) {
  // source: https://stackoverflow.com/a/73998199
  // x, y and z input refer to a D65/2° standard illuminant.
  // sR, sG and sB (standard RGB) output range = 0 / 255

  let X = x / 100;
  let Y = y / 100;
  let Z = z / 100;

  let R = X *  3.2406 + Y * -1.5372 + Z * -0.4986;
  let G = X * -0.9689 + Y *  1.8758 + Z *  0.0415;
  let B = X *  0.0557 + Y * -0.2040 + Z *  1.0570;

  return [R, G, B]
    .map(n => n > 0.0031308
      ? 1.055 * Math.pow(n, (1 / 2.4)) - 0.055
      : 12.92 * n)
    .map(n => n * 255)
    .map(n => Math.max(0, Math.round(n)));
}


// 0.05
// let xyz_max = [95.047, 100, 108.883]; //or: [0.96421, 1, 0.82521];
let xyz_max = [95.05, 100, 108.9];
let xyz_step = [0.1, 0.5, 0.89]; //[0.05, 0.5, 0.89];
// changes by (%): _, _, 1.01


function generateColorSet(xyz, leq) {
  let rgb = xyz2rgb(...xyz);


  // console.log(rgb2xyz(1, 0, 0));
  // console.log(rgb2xyz(2, 0, 0));

  // console.log(rgb2xyz(0, 1, 0));
  // console.log(rgb2xyz(0, 2, 0));

  // console.log(rgb2xyz(0, 0, 1));
  // console.log(rgb2xyz(0, 0, 2));

  // console.log(rgb2xyz(1, 1, 1));
  // console.log(rgb2xyz(2, 2, 2));
  // console.log(rgb2xyz(6, 6, 6));
  // let rgb_combos = [];
  let xyz_combos = [];
  if (leq) {
    for (let r=0; r<=rgb[0]; ++r) {
      for (let g=0; g<=rgb[1]; ++g) {
        for (let b=0; b<=rgb[2]; ++b) {
          // rgb_combos.push([r,g,b]);
          let xyz = rgb2xyz(r, g, b);
          xyz_combos.push(xyz);
        }
      }
    }
  } else {
    for (let r=rgb[0]; r<=255; ++r) {
      for (let g=rgb[1]; g<=255; ++g) {
        for (let b=rgb[2]; b<=255; ++b) {
          // rgb_combos.push([r,g,b]);
          let xyz = rgb2xyz(r, g, b);
          xyz_combos.push(xyz);
        }
      }
    }
  }

  // const jsonContent = JSON.stringify(xyz_combos);

  // fs.writeFile("./xyz.json", jsonContent, 'utf8', function (err) {
  //   if (err) {
  //     return console.log(err);
  //   }

  //   console.log("The file was saved!");
  // }); 
  return xyz_combos;
}


// https://bisqwit.iki.fi/story/howto/dither/jy/
// increments of .05
// increment of .5
// increments of .89

function hsvColMix(rgb) {
  let hsv = rgb2hsv(...rgb);
  let [h, s, v] = hsv;
  let H = h*2;
  let V = Math.min(1, v*2);

  let combos = [];

  for (let p=0; p<0.5; p+=0.01) {
    let h1 = p*H;
    let h2 = (1-p)*H;

    combos.push([hsv2rgb(h1, s, V), hsv2rgb(h2, s, V)]);
    console.log([h1, s, V], [h2, s, V], combos[combos.length-1]);
  }
  return combos;
}


function colMix(rgb) { // xyz is additive
  let XYZ = rgb2xyz(...rgb);

  let combos = [];

  // let [X, Y, Z] = xyz;
  let cols = generateColorSet(XYZ, additive);

  

  // source: https://stackoverflow.com/a/56457120
  // Additive mixing (good for light sources)
  // additive logic: col = c1+c2 => c2 = col-c1
  // c1 <= col, so get the less than or equal to combos:
  // let leq = generateColorSet(XYZ, additive);

  for (let xyz of cols) {
    let c = XYZ.map((v, i) => v-xyz[i]); // complementary color
    // combos.push([xyz2rgb(...xyz).map(v => v*2), xyz2rgb(...c).map(v => v*2)]);
    combos.push([xyz2rgb(...xyz), xyz2rgb(...c)]);
  }

  /*
  let leq_x = range({start:0, stop:X, step:xyz_step[0]});
  let leq_y = range({start:0, stop:Y, step:xyz_step[1]});
  let leq_z = range({start:0, stop:Z, step:xyz_step[2]});
  // inclusive:
  leq_x.push(X);
  leq_y.push(Y);
  leq_z.push(Z);

  // now get all the combos with the leq cols and their complementary cols:
  for (let x of leq_x) {
    for (let y of leq_y) {
      for (let z of leq_z) {
        let leq = [x, y, z];
        let c = xyz.map((v, i) => v-leq[i]); // complementary color
        combos.push([xyz2rgb(...leq), xyz2rgb(...c)]);
      }
    }
  }
  */

	return combos;
}


let rgb = [128, 128, 0]; //[118, 115, 0];
rgb = [174, 255, 0];
let combos = hsvColMix(rgb);

// console.log(combos);

/*
let combos_add = colMix(rgb, true);
console.log(closestColPair(combos_add, [255,0,0]));
let combos_sub = colMix(rgb, false);


console.log(combos_add.filter(el => Math.abs(255-el[0][0])<5));
console.log(combos_add.filter(el => Math.abs(255-el[1][0])<5));

console.log(combos_sub.filter(el => Math.abs(255-el[0][0])<5));
console.log(combos_sub.filter(el => Math.abs(255-el[1][0])<5));

console.log(combos_add.length/25, combos_sub.length);
console.log(closestColPair(combos_sub, [255,0,0]));
// console.log(closestCol(combos.map(el => el[0]), [255, 0, 0]));
// console.log(closestCol(combos.map(el => el[1]), [255, 0, 0]));
// rgb = [255, 0, 0];
// console.log(rgb);
// let xyz = rgb2xyz(...rgb);
// console.log(xyz);
// let xyz_rgb = xyz2rgb(...xyz);
// console.log(xyz_rgb);

console.log(rgb2xyz(255, 255, 255));
console.log(rgb2xyz(0, 0, 0));

// generateColorSet();

// console.log(xyz2rgb(95.05, 100, 105.3));
// console.log(xyz2rgb(95.05, 100, 105.1));
// 105-105.2
// 105.3-
// 105.9-106.8: 252 (.9)
// 106.9 - 107.6: 253
// 107.7 - 108.4: 254
// 108.5+ => 255
// https://en.wikipedia.org/wiki/Additive_color


// 95.0500	100.0000	108.9000
// increments of: _, _, .7

*/