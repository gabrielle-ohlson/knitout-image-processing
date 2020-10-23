// import * as imageColors from './image-color-quantize.js';
// let colors_arr = [];
// imageColors
//   .getData()
//   .then((result) => {
//     colors_arr = result;
//     return result;
//   })
//   .finally(() => {
//     console.log(colors_arr); // arr = imageColors.colors_arr;
//   });

const imageColors = require('./image-color-quantize.js');
let machine, palette, color_count, init_dir, other_dir, needle_bed, bird, odd_bird, even_bird;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let rows = [];
// let jacquard_arr = [];
let jacquard_passes = [];

// let needle_bed = 253; ////one extra so not counting from 0

const INFO = ({ OP, DIR, BED, NEEDLE, CARRIER }) => ({
  OP,
  DIR,
  BED,
  NEEDLE,
  CARRIER,
});

imageColors
  .getData()
  .then((result) => {
    colors_arr = result;
    return result;
  })
  .then(() => {
    ////heres where all the functions will go
    machine = colors_arr.pop();
    palette = colors_arr.pop();
    color_count = palette.length;
    machine.includes('kniterate') ? ((needle_bed = 253), (init_dir = '+'), (other_dir = '-')) : ((needle_bed = 541), (init_dir = '-'), (other_dir = '+')); ////one extra so not counting from 0
    //TODO: check to see how many needles Shima SWG091N2 actually has (15 gauge, 36inch??)
    bird = Array.from({ length: needle_bed }, (e, i) => i);
    odd_bird = bird.filter((x, i) => i % 2 !== 0);
    // odd_bird = odd_bird.map((el) => `b${el}`); //? maybe save for end so can work with the numbers for now
    even_bird = bird.filter((x, i) => i !== 0 && i % 2 === 0);
    // even_bird = even_bird.map((el) => `b${el}`); //? maybe save for end so can work with the numbers for now
  })
  .then((op, dir, bed, needle, carrier) => {
    for (let y = 0; y < colors_arr.length; ++y) {
      op = 'knit'; //TODO: make this variable
      // y % 2 === 0 ? (dir = '+') : (dir = '-'); //TODO: make this depend on where to carriers live for that particular machine
      bed = 'f'; //TODO: make this variable
      for (let x = 0; x < colors_arr[y].length; ++x) {
        needle = x + 1; //so counting from 1 not 0
        carrier = colors_arr[y][x];
        row.push([needle, carrier]);
        // row.push(
        //   INFO({
        //     OP: op,
        //     DIR: dir,
        //     BED: bed,
        //     NEEDLE: needle,
        //     CARRIER: carrier,
        //   })
        // );
      }
      // knitout.push(row);
      for (let i = 1; i <= color_count; ++i) {
        // let carrier_pass = row.filter((el) => el.CARRIER === i);
        let carrier_pass = row.filter((n) => n[1] === i);
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      rows.push(carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length)); ////?keep empty passes ?
      row = [];
      carrier_passes = [];
      // console.log(carrier_passes);
      // carrier_passes = carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length); //?keep empty passes ?
      // carrier_passes.forEach((el, idx) => (idx % 2 === 0 ? el.forEach((n) => (n.DIR = '+')) : el.forEach((n) => (n.DIR = '-'))));
    }
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0) {
        rows[i].reverse();
      }
    }
    console.log(rows[0]);
    console.log(rows[1]);
    jacquard_passes = rows.flat();
    console.log(jacquard_passes);
    let taken;
    for (let i = 0; i < jacquard_passes.length; ++i) {
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      carrier = jacquard_passes[i][0][1];
      // console.log(jacquard_passes[i]);
      // for (let x = 0; x < jacquard_passes[i].length; ++x) {
      const knitoutLines = (x) => {
        let front = jacquard_passes[i].find((element) => element[0] === x);
        // if (jacquard_passes[i][x] !== undefined) {
        if (front !== undefined) {
          // knitout.push(`knit ${dir} f${jacquard_passes[i][x][0]} ${jacquard_passes[i][x][1]}`);
          // knitout.push(`knit ${dir} f${jacquard_passes[i][x][0]} ${carrier}`);
          knitout.push(`knit ${dir} f${front[0]} ${carrier}`);
          taken = true;
          // jacquard_passes[i][x][0] === x + 1 ? (taken = true) : (taken = false);
        } else {
          taken = false;
        }
        if (i % 2 === 0 && !taken && x % 2 !== 0) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
        }
        if (i % 2 !== 0 && !taken && x % 2 === 0) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
        }
      };
      if (dir === '+') {
        for (let x = 1; x < colors_arr[0].length - 1; ++x) {
          knitoutLines(x);
        }
      } else {
        for (let x = colors_arr[0].length - 1; x > 0; --x) {
          knitoutLines(x);
        }
      }
      // for (let x = 1; x < colors_arr[0].length - 1; ++x) {
      // let front = jacquard_passes[i].find((element) => element[0] === x);
      // // if (jacquard_passes[i][x] !== undefined) {
      // if (front !== undefined) {
      //   // knitout.push(`knit ${dir} f${jacquard_passes[i][x][0]} ${jacquard_passes[i][x][1]}`);
      //   // knitout.push(`knit ${dir} f${jacquard_passes[i][x][0]} ${carrier}`);
      //   knitout.push(`knit ${dir} f${front[0]} ${carrier}`);
      //   taken = true;
      //   // jacquard_passes[i][x][0] === x + 1 ? (taken = true) : (taken = false);
      // } else {
      //   taken = false;
      // }
      // if (i % 2 === 0 && !taken && x % 2 !== 0) {
      //   knitout.push(`knit ${dir} b${x} ${carrier}`);
      // }
      // if (i % 2 !== 0 && !taken && x % 2 === 0) {
      //   knitout.push(`knit ${dir} b${x} ${carrier}`);
      // }
    }
    console.log(knitout);
    // jacquard_arr = [...rows];
    // let reverse_arr = [];
    // for (let i = 0; i < rows.length; ++i) {
    //   if (i % 2 === 0) {
    //     jacquard_arr.push(rows[i]);
    //   } else {
    //     for (let x = rows[i].length - 1; x >= 0; --x) {
    //       reverse_arr.push(rows[i][x]);
    //     }
    //     jacquard_arr.push(reverse_arr);
    //     reverse_arr = [];
    //   }
    // }
  })
  .then(() => {
    carrier_passes.forEach((el) => {
      //COME BACK!
      let knitout_str = JSON.stringify(el)
        .replace(/"/gi, '')
        .replace(/{|}|OP:|DIR:|BED:|NEEDLE:|CARRIER:/gi, '')
        .split(',');
      knitout_str = knitout_str.join(' ');
      // xfer_str = xfer_str.join(',').replace(/\n\n/gi, '\n'); //new //.replace(/\\\\/g, '\\') //new//check /
    });
  });
