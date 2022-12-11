const MAX_XFER_CT = 2; //TODO: adjust according to code

const helpers = require('./helpers.js');

// class Shaping {
//   constructor(prevN, n, side) {
//     this.prevN = prevN;
//     this.n = n;
//     this.side = side;

//     if (side === 'left') {
//       this.count = prevN-n;
//       this.direction = '+';
//     } else {
//       this.count = n-prevN;
//       this.direction = '-';
//     }

//     if (this.count > 0) this.type = 'increase';
//     else if (this.count < 0) this.type = 'decrease';
//     else this.type = null;
//     // this.type = type;
//     // this.content = content;
//   }

//   toggleDirection() {
//     if (this.direction === '+') this.direction = '-';
//     else this.direction = '+';
//   }
// }

class KnitoutOp {
  constructor(op) {
    this.op = op;
    this.d = undefined;
    this.bn0 = [];
    this.bn = [];
    this.cs = [];
    this.param = undefined; //for when something like header, extension, or rack that thats a different param
    this.comment = undefined;
    // this.bn = 
  }

  addArgs(key_vals) {
    for (let [key, val] of Object.entries(key_vals)) {
      if (typeof this[key] === Array && typeof val !== Array) this[key].push(val);
      else this[key] = val;
    }
  }

  generateCode() {
    let out = this.op;
    if (this.param) {
      if (typeof this.param === Array) out += ` ${this.param.join(' ')}`;
      else out += ` ${this.param}`;
    } else {
      if (this.d) out += ` ${this.d}`;
      if (this.bn0.length) out += ` ${this.bn0.join('')}`;
      if (this.bn.length) out += ` ${this.bn.join('')}`;
      if (this.cs.length) out += ` ${this.cs.join(' ')}`;
    }
    if (this.comment) out += ` ;${this.comment}`;
  }
}


class Shaping {
  constructor(type, side, count, prevN, newN, direction) {
    this.type = type;
    this.side = side;
    this.count = count;
    this.prevN = prevN;
    this.newN = newN;
    this.direction = direction;
  }
}


function trackShaping(side, prevN, newN, dict) {
  let count, type;
  if (side === 'left') count = prevN-newN;
  else count = newN-prevN;

  // dict key is the needle to insert the shaping after

  if (count > 0) {
    type = 'increase';
    if (side === 'left') { //insert before
      if (count > MAX_XFER_CT) { //NOTE: multi increase on left side *should always be knitted in the - direction, and start from prevN-1* //NOTE: increases for passes in - direction should *SKIP REST after inc* 
        dict[newN] = new Shaping(type, side, count, prevN-1, newN, '+');
        dict[prevN-1] = new Shaping(type, side, count, prevN-1, newN, '-');
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, '+'); // miss + {bed}{prevN+1} before inc // *knit - to new needle after inc (with twisted stitch, if relevant)* 
        dict[prevN] = new Shaping(type, side, count, prevN, newN, '-'); // miss + {bed}{prevN+1} before inc // then resume *(with twisted stitch, if revelant)*
      }
    } else { // right side
      if (count > MAX_XFER_CT) { //NOTE: multi increase on right side *should always be knitted in the + direction, and start from prevN+1* //NOTE: increases for passes in + direction should *SKIP REST after inc* 
        dict[newN] = new Shaping(type, side, count, prevN+1, newN, '-');
        dict[prevN+1] = new Shaping(type, side, count, prevN+1, newN, '+');
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, '-'); // miss - {bed}{prevN-1} before inc // *knit + to new needle after inc (with twisted stitch, if relevant)*
        dict[prevN] = new Shaping(type, side, count, prevN, newN, '+'); // miss - {bed}{prevN-1} before inc // then resume *(with twisted stitch, if relevant)*
      }
    }
  } else if (count < 0) {
    type = 'decrease'; //TODO: deal with how 
    count = Math.abs(count); //? //TODO: determine if should could keep it like this
    if (side === 'left') {
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on left side *should always be knitted in the + direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if direction === '+', insert before and then just resume. if direction === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if direction === '-', miss + {bed}{newN+1} before dec
      }
    } else {  // right side
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on right side *should always be knitted in the - direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if direction === '-', insert before and then just resume. if direction === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if direction === '+', miss - {bed}{newN-1} before dec
      }
    }
  }
}
/*
CONDITIONS FOR NEW PASS:
-----------------------
- carrier changes
- direction changes
*/
function rowsPassesArray(file_content) {
  let file_start = /^(?!;).+/gm.exec(file_content).index;
  let rows_start = /;row:/.exec(file_content).index;
  let bindoff_start = /;bindoff/.exec(file_content).index; //TODO: adjust for when do drop bindoff
  // get all row matches with: file_content2.match(/;row/gm)
  let header_section = file_content.slice(0, file_start);
  let caston_section = file_content.slice(file_start, rows_start);
  let main_section = file_content.slice(rows_start, bindoff_start);
  let bindoff_section = file_content.slice(bindoff_start, -1);

  let rows = main_section.split(/;row:.+\r?\n/).slice(1); //since first will be blank

  if (!rows.length) throw new Error('Input file does not contain the format needed to work with this program.  Please reproduce the file with the "knitify" program.')

  for (let r=0; r<rows.length; ++r) {
    rows[r] = rows[r].split(/\r?\n/);
  }

  return [header_section.split(/\r?\n/), caston_section.split(/\r?\n/), rows, bindoff_section.split(/\r?\n/)];
}


function determineShaping(shape_code) { //TODO: ensure shape_code contains shortrowing
  let rows_sect_cts = [];
  let shaping = [];
  let rows_edgeNs = [];

  let prev_edgeNs = [];
  // let prev_leftN, prev_rightN;
  // for (let i=0; i<shape_code.length; ++i) {
  for (let row_code of shape_code) {
    let row_shaping = {}; //[];
    let row_edgeNs = [];
    // let left_idx = shape_code[i].indexOf(1); //+1; //+1 since first needle is 1
    // let right_idx = shape_code[i].lastIndexOf(1); //+1;

    // let sect_shaping = [];
    let sect_edgeNs = [];

    let sect_ct = 0;
    for (let i=0; i<row_code.length; ++i) {
      let px = row_code[i];
      if (!sect_edgeNs.length && px === 1) { // left needle
        let leftN = i+1; // +1 since first needle is 1
        /*
        if (prev_edgeNs.length > sect_ct) {
          if ()
          let prev_edgeNs = rows_edgeNs[rows_edgeNs.length-1];
        }
        if ()
        if (prev_leftN && leftN !== prev_leftN) sect_shaping.push(prev_leftN-leftN); // negative means decrease, 
        else sect_shaping.push(0);

        prev_leftN = leftN; 
        */
        sect_edgeNs.push(leftN);
      } else if (sect_edgeNs.length === 1) { // right needle
        let rightN;
        if (px === 0) rightN = i; // *not* +1 since we can about the idx before this
        else if (i === row_code.length-1) rightN = i+1;
        else continue;

        /*
        let l = 0;
        let r = 0;
        if (prev_edgeNs.length > sect_ct) {
          let prev_leftN = prev_edgeNs[0];
          let prev_rightN = prev_edgeNs[0]
          let prev_edgeNs = rows_edgeNs[rows_edgeNs.length-1];
        }

        if (prev_rightN && rightN !== prev_rightN) sect_shaping.push(rightN-prev_rightN); // negative means decrease, 
        else sect_shaping.push(0); //shaping = 0;
        prev_rightN = rightN;
        */
        sect_edgeNs.push(rightN); 
        row_edgeNs.push(sect_edgeNs);
        sect_edgeNs = [];

        sect_ct += 1; //new
      }
      // } else if (sect_edgeNs.length === 1 && (px === 0 || i === row_code.length-1)) { // right needle
      //   let rightN = i; // *not* +1 since we can about the idx before this
      //   if (prev_rightN && rightN !== prev_rightN) sect_shaping.push(rightN-prev_rightN); // negative means decrease, 
      //   else sect_shaping.push(0); //shaping = 0;

      //   prev_rightN = rightN;
      //   sect_edgeNs.push(rightN); 
      //   row_edgeNs.push(sect_edgeNs);
      //   sect_edgeNs = [];
      // }
    }

    rows_sect_cts.push(sect_ct);

    if (prev_edgeNs.length) { //something going wrong here...
      /*
      if (prev_edgeNs.length === sect_ct) {
        for (let i=0; i<sect_ct; ++i) {
          let l_shaping = prev_edgeNs[i][0]-row_edgeNs[i][0];
          let r_shaping = row_edgeNs[i][1]-prev_edgeNs[i][1];
          row_shaping.push([l_shaping, r_shaping]);
        }
      } else {
      */

      let leftover_prev_edgeNs = [... prev_edgeNs]; // we will find out of there are any prev sections that need to be bound off
      for (let i=0; i<sect_ct; ++i) {
        /*
        let sect_shaping = {}; //[]; //new
        let l_shaping = 0;
        let r_shaping = 0;
        */

        let leftN = row_edgeNs[i][0];
        let rightN = row_edgeNs[i][1];
        
        let sect_matches = prev_edgeNs.filter(el => el[0] <= rightN && el[1] >= leftN);
        // let sect_match = prev_edgeNs.find(el => el[0] <= rightN && el[1] >= leftN);
        /* if (sect_matches.length === 1) {
          let sect_match = sect_matches[0];

          let prev_leftN = sect_match[0];
          let prev_rightN = sect_match[1];

          let first_sect = row_code.indexOf(1, prev_leftN); // search for first indication of a section that overlaps with the match

          if (first_sect === leftN-1) { // no section before this (otherwise, the section before this will get assigned the left shaping)
            l_shaping = prev_leftN-leftN;
          }

          let next_sect = row_code.indexOf(1, rightN); // search for next indication of a section that overlaps with the match after this one
          if (next_sect === -1) { // this is the last section
            r_shaping = rightN-prev_rightN;
          } else { // another section is coming afterwards, so we are just decreasing based on the needles between
            r_shaping = rightN-next_sect; // even tho next_sect doesn't have +1, still works bc otherwise we'd have to do -1 after
          }
          // let sect_match = where a prev sect L needle is <= this sect's R needle && prev sect R needle is >= this sect's L needle

        } else */
        if (sect_matches.length) { // multiple prev sections merging
          for (let s=0; s<sect_matches.length; ++s) {
            leftover_prev_edgeNs = leftover_prev_edgeNs.filter(el => !sect_matches.includes(el));

            let prev_leftN = sect_matches[s][0];
            let prev_rightN = sect_matches[s][1];

            if (i === 0) { // no overlapping match before this
              let first_sect = row_code.indexOf(1, prev_leftN); // search for first indication of a section that overlaps with the match

              if (first_sect === leftN-1) { // no section before this
                trackShaping('left', prev_leftN, leftN, row_shaping);
                /*
                let l =  new Shaping(prev_leftN, leftN, 'left');
                if (l.count) {
                  row_shaping[leftN] = l;
                  if (l.type === 'increase') {
                    let prev_l = Object.assign(Object.create(Object.getPrototypeOf(l)), l); 
                    // let prev_l = {...l};
                    prev_l.toggleDirection(); // otherwise, we are going to want to knit these extra needles before decreasing if bindoff dec //TODO: remember this
                    row_shaping[prev_leftN] = prev_l;
                  }
                }
                */
              }
            } else { // this will be stored twice, as right shaping for previous section and left shaping for this section.  the one that will be used when direction matches 
              let leftN_ = sect_matches[s-1][1]+1;
              trackShaping('left', prev_leftN, leftN_, row_shaping);
              /*
              let l = new Shaping(prev_leftN, leftN_, 'left');
              if (l.count) row_shaping[leftN_] = l;
              */
            }

            if (i === sect_matches.length-1) { // no overlapping match after this
              let next_sect = row_code.indexOf(1, rightN); // search for next indication of a section in the current row that overlaps with the match after this one

              if (next_sect === -1) { // this is the last section that overlaps with this match
                trackShaping('right', prev_rightN, rightN, row_shaping);
                /*
                let r = new Shaping(prev_rightN, rightN, 'right');
                
                if (r.count) {
                  row_shaping[rightN] = r;
                  if (r.type === 'increase') {
                    let prev_r = Object.assign(Object.create(Object.getPrototypeOf(r)), r); 
                    prev_r.toggleDirection(); // otherwise, we are going to want to knit these extra needles before decreasing if bindoff dec //TODO: remember this
                    row_shaping[prev_rightN] = prev_r;
                  }
                }
                */
              } else { // another section is coming afterwards, so we are just decreasing based on the needles between
                trackShaping('right', next_sect, rightN, row_shaping);
                /*
                let r = new Shaping(next_sect, rightN, 'right'); // even tho next_sect doesn't have +1, still works bc otherwise we'd have to do -1 after (since we care about the needle to the left of the next_sect start needle)
                // rightN-next_sect
                if (r.count) row_shaping[rightN] = r;
                */
              }

            }
          }
        } else {
          let count = rightN-leftN+1; //TODO: make sure everything is ok with +1 for others
          row_shaping[leftN] = new Shaping('increase', 'left', count, rightN, leftN, '+'); //TODO: make this 'caston' instead of 'increase' //?
          row_shaping[rightN] = new Shaping('increase', 'right', count, leftN, rightN, '+');
          // console.log('TODO: deal with situation where need to caston new section');
        }

        // row_shaping.push([l_shaping, r_shaping]);
      }
    /* } */
      if (leftover_prev_edgeNs.length) { // we need to bind these off (do it in preview row)
        for (let edgeNs of leftover_prev_edgeNs) {
          let prev_leftN = edgeNs[0];
          let prev_rightN = edgeNs[1];

          let count = prev_rightN-prev_leftN+1; //TODO: make sure everything is ok with +1 for others

          shaping[shaping.length-1][prev_leftN-1] = new Shaping('bindoff', 'left', count, prev_leftN, prev_rightN, '-');
          shaping[shaping.length-1][prev_rightN+1] = new Shaping('bindoff', 'right', count, prev_rightN, prev_leftN, '+');

          // trackShaping('left', prev_leftN, prev_rightN, row_shaping); //TODO: ensure there aren't duplicates here
          // trackShaping('right', prev_rightN, prev_leftN, row_shaping); //TODO: ensure there aren't duplicates here
          /*
          let l = new Shaping(prev_leftN, prev_rightN, 'left');
          if (l.count) row_shaping[prev_leftN] = l;
          let r = new Shaping(prev_rightN, prev_leftN, 'right');
          if (r.count) row_shaping[prev_rightN] = r;
          */
        }
      }
    } /* else {
      for (let i=0; i<sect_ct; ++i) {
        row_shaping.push([0, 0]);
      }
    } */
    shaping.push(row_shaping);
    prev_edgeNs = row_edgeNs;
    rows_edgeNs.push(row_edgeNs);
  }

  return [rows_edgeNs, rows_sect_cts, shaping];
}

// function determineShaping(rows_edgeNs) {
// }

// global variables:
let MIN = Infinity, MAX = -Infinity;

let specs = {};
//   'machine': undefined,
//   'inc_method': undefined
// }
// let INC_METHOD = 'split';
// let MACHINE = 'swgn2';

let carrier_track = {};
let working_needles = {
  'f': [],
  'b': [],
  'fs': [],
  'bs': []
}

let shaping_needles = [];

let twisted_stitches = [];



// increase on left:
// [ ] if d === '+': // miss + {bed}{prevN+1} before inc // *knit - to new needle after inc (with twisted stitch, if relevant)* 
// [ ] if d === '-': // miss + {bed}{prevN+1} before inc // then resume *(with twisted stitch, if revelant)*
// [X] NOTE: multi increase on left side *should always be knitted in the - direction, and start from prevN-1* //NOTE: increases for passes in - direction should *SKIP REST after inc* 

// increase on right:
// [ ] if d === '+': // miss - {bed}{prevN-1} before inc // then resume *(with twisted stitch, if relevant)*
// [ ] if d === '-': // miss - {bed}{prevN-1} before inc // *knit + to new needle after inc (with twisted stitch, if relevant)*
// [X] NOTE: multi increase on right side *should always be knitted in the + direction, and start from prevN+1* //NOTE: increases for passes in + direction should *SKIP REST after inc* 


// decrease on left:
// [ ] hmmm... direction doesn't matter.... // if direction === '-', miss + {bed}{newN+1} before dec
// [ ] NOTE: multi decrease on left side *should always be knitted in the + direction, and should not knit through newN during dec* // TODO: if direction === '+', insert before and then just resume. if direction === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.

// decrease on right:
// [ ] hmmm... direction doesn't matter.... // if direction === '+', miss - {bed}{newN-1} before dec
// [ ] NOTE: multi decrease on right side *should always be knitted in the - direction, and should not knit through newN during dec* // TODO: if direction === '-', insert before and then just resume. if direction === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.


function insertShaping(shaping, carrier, output, row_idx) {
  // let twisted_stitches = [];
  output.push(`;${shaping.type} ${Math.abs(shaping.count)} on ${shaping.side} (${shaping.prevN} => ${shaping.newN})`);
  if (shaping.type === 'increase') {
    if (shaping.count > MAX_XFER_CT) helpers.incMultDoubleBed(shaping.side, shaping.count, shaping.prevN, carrier, output);
    else {
      if (twisted_stitches.length) {
        let requiredNs = [`f${shaping.prevN}`, `b${shaping.prevN}`];

        if (shaping.side === 'left') {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN+1}`, `b${shaping.prevN+1}`);

          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(';twisted stitch !', `miss - ${bn} ${carrier}`, `knit + ${bn} ${carrier}`, `miss - ${bn} ${carrier}`); //TODO: //remove '!'
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        } else {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN-1}`, `b${shaping.prevN-1}`);
          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(';twisted stitch !', `miss + ${bn} ${carrier}`, `knit - ${bn} ${carrier}`, `miss + ${bn} ${carrier}`); //TODO: //remove '!'
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        }
      }

      if (shaping.count === 1) twisted_stitches = twisted_stitches.concat(helpers.inc1DoubleBed(specs, shaping.side, shaping.prevN, carrier, output));
      else if (shaping.count === 2) twisted_stitches = twisted_stitches.concat(helpers.inc2DoubleBed(specs, shaping.side, shaping.prevN, carrier, output));
    }

    /*
    if (shaping.count === 1) helpers.inc1DoubleBed(specs, shaping.prevN, shaping.side, carrier, output);
    else if (shaping.count === 2) helpers.inc2DoubleBed(specs, shaping.prevN, shaping.side, carrier, output);
    else helpers.incMultDoubleBed(shaping.prevN, shaping.count, shaping.side, carrier, output); //TODO: see what direction it is knitting in
    */
  } else if (shaping.type === 'decrease') { //TODO: add temp fix, if necessary, for kniterate
    if (shaping.count > MAX_XFER_CT) helpers.bindoff(specs, shaping.side, shaping.count, shaping.prevN, carrier, output, true, []);
    else helpers.decDoubleBedTempFix(specs, shaping.side, shaping.count, shaping.prevN, output);
    /*
    if (shaping.count === -1) helpers.dec1DoubleBed(specs, shaping.side, output);
    else if (shaping.count === -2) helpers.dec2DoubleBed(specs, shaping.prevN, shaping.side, output);
    else helpers.BINDOFF(MACHINE, shaping.prevN, Math.abs(shaping.count), shaping.side, carrier, true, output);
    */
  } else if (shaping.type === 'bindoff') {
    let off_limits = shaping.side === 'left' ? shaping.prevN-1 : shaping.prevN+1;
    helpers.bindoff(specs, shaping.side, shaping.count, shaping.prevN, carrier, output, false, off_limits);
  }

  let newN_idx = shaping_needles.indexOf(shaping.newN);
  let prevN_idx = shaping_needles.indexOf(shaping.prevN);

  if (newN_idx !== -1) delete shaping_needles[newN_idx];
  if (prevN_idx !== -1) delete shaping_needles[prevN_idx];
  // return twisted_stitches;
}


let yarn_ops = ['in', 'out', 'inhook', 'releasehook', 'outhook'];

function knitoutInfo(ln) {
  let info =  ln.includes(';') ? ln.slice(0, ln.indexOf(';')).trim().split(' ') : ln.trim().split(' ');

  let bn0, bn, d;
  let cs = [];
  let op = info[0];

  // if (!ln.trim().length || ln.trim()[0] === ';') output.push(ln);

  if (op.trim().length && op.trim()[0] !== ';' && op !== 'rack' && !(op.length > 1 && op.slice(0, 2) === 'x-')) {
    // let bn0, bn;
    // let d;
    // let cs = [];
    //TODO: if n === row endN, we assume it was the user's intention to have the carrier miss out of the way, so we can add a miss if no longer ends with the end needle
    if (yarn_ops.includes(op)) cs = info.slice(1);
    else if (op === 'knit' || op === 'tuck' || op === 'miss' || op === 'split') {
      d = info[1];
      if (op === 'split') {
        bn0 = info[2];
        bn = info[3];
        cs = info.slice(4);
      } else {
        bn = info[2];
        cs = info.slice(3);
      }
    } else if (op === 'xfer') {
      bn0 = info[1];
      bn = info[2];
    } else if (op === 'drop')  bn = info[1];
    else throw new Error(`Unrecognized operation: ${op}.`)

    // let b = bn.match(/[a-zA-Z]+/)[0];
    // let n = Number(bn.match(/\d+/)[0]);
  }
  return [op, d, bn0, bn, cs];
}

function cookieCutter(row, edgeNs, row_shaping, output, row_idx) {
  // let twisted_stitches = [];
  let skip_args = undefined;
  let [leftN, rightN] = edgeNs;

  let k_args = {
    'd': undefined,
    'bn': [],
    'cs': [],
  };

  row_loop: for (let r=0; r<row.length; ++r) { //TODO: filter out any extensions/racks that don't work here
    let ln = row[r];
    // if (!ln.trim().length || ln.trim()[0] === ';') output.push(ln);
    let [op, d, bn0, bn, cs] = knitoutInfo(ln);

    if (!bn) {
      if (yarn_ops.includes(op)) {
        if (op === 'out' || op === 'outhook') {
          for (let c of cs) {
            delete carrier_track[c];
          }
        }
      }

      output.push(ln);
    } else {
      if (bn0) {
        let b0 = bn0.match(/[a-zA-Z]+/)[0];
        let n0 = Number(bn.match(/\d+/)[0]);

        if (n0 < leftN || n0 > rightN) continue;
        else {
          let n0_idx = working_needles[b0].indexOf(n0);
          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
        }
      }

      //TODO: if n === row endN, we assume it was the user's intention to have the carrier miss out of the way, so we can add a miss if no longer ends with the end needle
      let b = bn.match(/[a-zA-Z]+/)[0];
      let n = Number(bn.match(/\d+/)[0]);

      if (d) k_args.d = d; //new
      // k_args.bn = [b, n]; //new

      if (cs.length) { //TODO: have option for shaping without cs.length when increasing or decreasing by xfer //?
        k_args.cs = cs; //new //ToDO: determine if should be after parseInt

        // update min and max needles of the piece if its the caston:
        if (!row_idx && op !== 'miss') {
          if (n < MIN) MIN = n;
          if (n > MAX) MAX = n;
        } else if (op === 'miss') { //we assume that we should miss past the end needle, since that's what is in the original code 
          if (n === MIN && d === '-' && k_args.bn[1] !== leftN) output.push(`miss - f${leftN} ${cs.join(' ')}`);
          else if (n === MAX && d === '+' && k_args.bn[1] !== rightN) output.push(`miss + f${rightN} ${cs.join(' ')}`);
        }
        // } else if (op === 'miss' && ((n === MIN && d === '-' && k_args.bn[1] !== leftN) || (n === MAX && d === '+' && k_args.bn[1] !== rightN))) {
        //   output.push(';miss end needle', `miss ${d} f${} ${cs.join(' ')}`); //remove //debug
        //   console.log(k_args, d, n, leftN, rightN, MIN, MAX);
        // }

        if (skip_args) {
          if (k_args.d !== skip_args.d || k_args.d !== skip_args.cs) skip_args = undefined;
          else continue row_loop;
        }

        for (let c=0; c<cs.length; ++c) {
          cs[c] = parseInt(cs[c]);
          carrier_track[cs[c]] = d; //new //*
        }

        if (shaping_needles.length) {
          let shapeNs = [];
          
          if (d === '+') shapeNs = shaping_needles.filter(el => el < n);
          else shapeNs = shaping_needles.filter(el => el > n); //TODO: determine if need to reverse this

          // if (prevNs.length) {
          //   for (let prevN of prevNs) {
          //     let shaping = row_shaping[prevN];
          //     if (shaping.direction === d) insertShaping(shaping, shaping_needles, cs[0], output);
          //   }
          // }

          if (shaping_needles.includes(n)) shapeNs.push(n); //shaping = row_shaping[n];

          if (shapeNs.length) {
            for (let shapeN of shapeNs) {
              let shaping = row_shaping[shapeN];

              if (!shaping.direction || shaping.direction === d) {
                if (shaping.type === 'decrease' && shaping.count > MAX_XFER_CT) {
                  if (shaping.side === 'left' && d === '-') { // for multi decrease on left side: if d === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n>=shaping.prevN; --n) {
                      output.push(`knit - b${n} ${cs.join(' ')}`);
                    }
                  } else if (shaping.side === 'right' && d === '+') { // for multi decrease on right side: if d === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n<=shaping.prevN; ++n) {
                      output.push(`knit + b${n} ${cs.join(' ')}`); 
                    }
                  }
                }

                // twisted_stitches = twisted_stitches.concat(insertShaping(shaping, cs.join(' '), output, row_idx)); //beep
                insertShaping(shaping, cs.join(' '), output, row_idx);

                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
              }

              /*
              if (shaping.direction !== d && shaping.type === 'decrease' && Math.abs(shaping.count) > MAX_XFER_CT) {
                let condition = d === '+' ? ((n_) => {n_ <= shaping.prevN}) : ((n_) => {n_ >= shaping.prevN});
                // if (d === '+') condition = (n_) => {n_ <= shaping.prevN};
                // else condition = (n_) => {n_ >= shaping.prevN};
                shape_row_loop: for (r; r<row.length; ++r) {
                  let ln_ = row[r];

                  let [op_, d_, bn0_, bn_, cs_] = knitoutInfo(ln_);
                  if (!bn_) output.push(ln_);
                  else {
                    let b_ = bn_.match(/[a-zA-Z]+/)[0];
                    let n_ = Number(bn_.match(/\d+/)[0]);
                    if (condition(n_)) {
                      if (bn0) {
                        let b0 = bn0.match(/[a-zA-Z]+/)[0];
                        let n0 = Number(bn.match(/\d+/)[0]);
                
                        if (!eligible_needles.includes(n0)) continue shape_row_loop;
                        else {
                          let n0_idx = working_needles[b0].indexOf(n0);
                          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
                        }
                      }

                      if (!working_needles[b_].includes(n_)) working_needles[b_].push(n_);
                      output.push(ln_);
                    } else break shape_row_loop;
                  }
                }

                insertShaping(shaping, cs[0], output, row_idx);
                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
                continue;
              } else if (shaping.direction === d) {
                insertShaping(shaping, cs[0], output, row_idx);
                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
              }
              */
            }
          }
        }
      }

      if (n >= leftN && n <= rightN) {
        k_args.bn = [b, n]; //new

        if (!working_needles[b].includes(n)) working_needles[b].push(n);
        if (op === 'knit' && twisted_stitches.includes(bn)) {
          if (d === '+') {
            output.push(';twisted stitch', `miss + ${bn} ${cs.join(' ')}`, `knit - ${bn} ${cs.join(' ')}`, `miss + ${bn} ${cs.join(' ')}`);
          } else {
            output.push(';twisted stitch', `miss - ${bn} ${cs.join(' ')}`, `knit + ${bn} ${cs.join(' ')}`, `miss - ${bn} ${cs.join(' ')}`);
          }
          twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
        } else output.push(ln);
      }
      
      // {
      //   let bn = info[2];
      //   b = bn.match(/[a-zA-Z]+/)[0];
      //   n = Number(bn.match(/\d+/)[0]);
      // }

    }
  }
}

function generateKnitout(file_content, shape_code, inc_method) {
  specs['inc_method'] = inc_method; //set global
  let [header_section, caston_section, rows, bindoff_section] = rowsPassesArray(file_content);

  let machine_header = header_section.find(el => el.includes(';;Machine:'));

  specs['machine'] = machine_header ? machine_header.split(':')[1].trim().toLowerCase() : 'swgn2';
  let output = header_section;

  let [rows_edgeNs, rows_sect_cts, shaping] = determineShaping(shape_code); //NOTE: shape_code should be `shape_code_reverse`

  // let [init_leftN, init_rightN] = rows_edgeNs[0];

  let sect_carriers = []; //TODO: have function for replacing carriers with short rows
  for (let r=0; r<rows.length; ++r) {
    output.push(`;row: ${r+1}`);

    shaping_needles = Object.keys(shaping[r]).map(Number);
    let eligible_needles = [];
    for (let edgeNs of rows_edgeNs[r]) {
      for (let n=edgeNs[0]; n<=edgeNs[1]; ++n) {
        eligible_needles.push(n);
      }
    }

    for (let b of Object.keys(working_needles)) {
      working_needles[b] = working_needles[b].filter(n => eligible_needles.includes(n)); //n >= leftN && n <= rightN);
    }

    // if (r === 0) {
    //   cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r], shaping_needles, output);
    // }

    let sect_ct = rows_edgeNs[r].length;
    for (let i=0; i<rows_edgeNs[r].length; ++i) {
      if (sect_ct > 1) output.push(`;section: ${i+1}`)
      if (r === 0) cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r], output); //TODO: add this back in
      cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r], output, r);
    }
  }

  let bindoff_ln = bindoff_section.find(ln => ln.includes('knit '));

  if (bindoff_ln) {
    output.push(';bindoff section');
    
    let [op, d, bn0, bn, cs] = knitoutInfo(bindoff_ln);
    let bindoff_carrier = cs[0]; //.join(' ');

    let bindoff_edgeNs = rows_edgeNs[rows.length-1][0]; //TODO: do this for each section, if applicable
    let bindoff_count = bindoff_edgeNs[1]- bindoff_edgeNs[0]+1;
    let bindoff_side, bindoffN;

    if (carrier_track[bindoff_carrier] === '-') {
      bindoff_side = 'left';
      bindoffN = bindoff_edgeNs[0];
    } else {
      bindoff_side = 'right';
      bindoffN = bindoff_edgeNs[1];
    }

    helpers.bindoff(specs, bindoff_side, bindoff_count, bindoffN, bindoff_carrier, output, false, []);
  } else {
    output.push(';drop finish');
    working_needles['f'].sort();
    working_needles['b'].sort();

    for (let n of working_needles['f']) {
      output.push(`drop f${n}`);
    }

    for (let n of working_needles['b']) {
      output.push(`drop b${n}`);
    }
  }

  for (let c of Object.keys(carrier_track)) { // take out any carriers that weren't taken out yet
    if (specs.machine === 'swgn2') output.push(`outhook ${c}`);
    else output.push(`out ${c}`);
  }
  
  //TODO: add bindoff section

  // shaped_rows = shaped_rows.flat();
	let final_file = JSON.stringify(output).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
	final_file = final_file.join('\n');
  return final_file;
}


module.exports = { generateKnitout };