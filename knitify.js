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
let machine, palette, color_count;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let rows = [];

// let needle_bed = 253; ////one extra so not counting from 0
let needle_bed, bird, odd_bird, even_bird;

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
    machine.includes('kniterate') ? (needle_bed = 253) : (needle_bed = 541); ////one extra so not counting from 0
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
      y % 2 === 0 ? (dir = '+') : (dir = '-'); //TODO: make this depend on where to carriers live for that particular machine
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
    console.log(rows[0]);
    console.log(rows[20]);
    console.log(rows.length);
    ///
    // let jacquard_arr = [...carrier_passes];
    // let jacquard_arr = Object.values(carrier_passes);
    // let jacquard_arr = [];
    // carrier_passes.forEach((obj) => jacquard_arr.push(Object.values(obj)));
    // let results = [];
    // let jacquard_passes = [];
    // let cycles = [];
    // for (let i = 0; jacquard_arr.length > 0; ++i) {
    //   if (jacquard_arr[i] === undefined) {
    //     break;
    //   }
    //   // if (jacquard_arr[i] !== undefined) {
    //   if (!cycles.includes(jacquard_arr[i][0].CARRIER)) {
    //     cycles.push(jacquard_arr[i][0].CARRIER);
    //     // results.push(jacquard_arr[i]);
    //     // results.push(Object.values(jacquard_arr[i]));
    //     jacquard_arr[i].forEach((obj) => results.push(Object.values(obj)));
    //     // results.push({ ...jacquard_arr[i] });
    //   } else {
    //     // jacquard_passes.push(Object.values(results));
    //     jacquard_passes.push(results);
    //     // jacquard_passes.push(JSON.parse(JSON.stringify(results)));
    //     // jacquard_passes.push({ ...results });
    //     jacquard_arr = jacquard_arr.slice(results.length);
    //     results = [];
    //     cycles = [];
    //     i = -1;
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
