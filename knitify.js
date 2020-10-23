//TODO: add inhook, outhook, & release hook; options for bind-off and cast-on (//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
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

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const imageColors = require('./image-color-quantize.js');
let machine, palette, color_count, init_dir, other_dir, needle_bed, bird, odd_bird, even_bird;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let rows = [];
let jacquard_passes = [];

// const INFO = ({ OP, DIR, BED, NEEDLE, CARRIER }) => ({
//   OP,
//   DIR,
//   BED,
//   NEEDLE,
//   CARRIER,
// });

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
      for (let i = 1; i <= color_count; ++i) {
        let carrier_pass = row.filter((n) => n[1] === i);
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      rows.push(carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length)); ////?keep empty passes ?
      row = [];
      carrier_passes = [];
    }
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0) {
        rows[i].reverse();
      }
    }
    jacquard_passes = rows.flat();
    let taken;
    for (let i = 0; i < jacquard_passes.length; ++i) {
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      carrier = jacquard_passes[i][0][1];
      const knitoutLines = (x) => {
        let front = jacquard_passes[i].find((element) => element[0] === x);
        if (front !== undefined) {
          knitout.push(`knit ${dir} f${front[0]} ${carrier}`);
          taken = true;
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
    }
    console.log(knitout);
    let carriers_str = '';
    for (let i = 1; i <= color_count; ++i) {
      carriers_str = `${carriers_str} ${i}`;
    }
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
  })
  .finally(() => {
    //COME BACK!
    let knitout_str = JSON.stringify(knitout)
      .replace(/\[|\]|"/gi, '')
      .split(',');
    knitout_str = knitout_str.join('\n');
    let new_file = readlineSync.question(chalk.blue.bold('What would you like to save your file as? '));
    if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));
    fs.writeFile(`./out-files/${new_file}.k`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(chalk.green(`\nThe knitout file has successfully been written and can be found in the 'out-files' folder.`));
    });
  });
