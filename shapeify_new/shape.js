const MAX_XFER_CT = 2; //TODO: adjust according to code
const MIN_FLOAT_DIST = 5;

const { KnitoutOp, tuckPattern, inc1DoubleBed, inc2DoubleBed, incMultDoubleBed, decDoubleBedTempFix, bindoff } = require('./helpers.js');


function arraysEqual(a, b, order_matters) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    if (order_matters) return a.every((val, idx) => val === b[idx]);
    else return a.every(val => b.includes(val));
  } else return false;
}


// global variables:
let header_section = [], caston_section = [], bindoff_section = [];
let rows = [];
let rows_edgeNs = [];
let rows_sect_keys = [];
// left and right needles of original piece:
let MIN = Infinity, MAX = -Infinity;
let input_carriers = [];

let specs = {};
let leftover_carriers = [];

let sect_track = {};

let carrier_track = {};

let working_needles = {
  'f': [],
  'b': [],
  'fs': [],
  'bs': []
}

let shaping_needles = [];

let twisted_stitches = [];

class Carrier {
  constructor({row, needle, direction}) {
    this.row = row;
    this.needle = needle;
    this.direction = direction;
  }
}


class Section {
  constructor(idx) {
    this.idx = idx;
    this.edgeNs = {};
    this.parents = [];
    this.children = {};
    this.carriers = [];
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
function rowsArray(file_content) {
  let file_start = /^(?!;).+/gm.exec(file_content).index;
  let rows_start = /;row:/.exec(file_content).index;
  let bindoff_start = /;bindoff/.exec(file_content).index; //TODO: adjust for when do drop bindoff
  // get all row matches with: file_content2.match(/;row/gm)
  let header_arr = file_content.slice(0, file_start).split(/\r?\n/);
  let caston_arr = file_content.slice(file_start, rows_start).split(/\r?\n/);
  let main_section = file_content.slice(rows_start, bindoff_start);
  let bindoff_arr = file_content.slice(bindoff_start, -1).split(/\r?\n/);

  let rows_arr = main_section.split(/;row:.+\r?\n/).slice(1); //since first will be blank

  if (!rows_arr.length) throw new Error('Input file does not contain the format needed to work with this program.  Please reproduce the file with the "knitify" program.')

  for (let r=0; r<rows_arr.length; ++r) {
    rows_arr[r] = rows_arr[r].split(/\r?\n/);
  }
  return [header_arr, caston_arr, rows_arr, bindoff_arr];
}


function determineShaping(shape_code) {
  let sect_idx = 0;

  let shaping = [];

  let prev_edgeNs = {};

  for (let r=0; r<shape_code.length; ++r) {
    let row_code = shape_code[r];

    let row_shaping = {};
    let row_sect_track = {};
    let row_edgeNs = [];

    let sect_edgeNs = [];

    let sect_ct = 0;
    for (let i=0; i<row_code.length; ++i) {
      let px = row_code[i];
      if (!sect_edgeNs.length && px === 1) { // left needle
        let leftN = i+1; // +1 since first needle is 1

        sect_edgeNs.push(leftN);
      } else if (sect_edgeNs.length === 1) { // right needle
        let rightN;
        if (px === 0) rightN = i; // *not* +1 since we can about the idx before this
        else if (i === row_code.length-1) rightN = i+1;
        else continue;

        sect_edgeNs.push(rightN);
        row_edgeNs.push(sect_edgeNs);

        if (r === 0) { // first row
          sect_track[sect_idx] = new Section(sect_idx);

          sect_track[sect_idx].edgeNs[r] = sect_edgeNs;

          row_sect_track[sect_idx] = sect_edgeNs; // keep track on sections in this row
          sect_idx += 1;
        }

        sect_edgeNs = [];

        sect_ct += 1;
      }
    }

    if (Object.keys(prev_edgeNs).length) {
      let leftover_prev_edgeNs = {...prev_edgeNs}; // we will find out of there are any prev sections that need to be bound off

      for (let i=0; i<sect_ct; ++i) {
        let sect_shaping = {};

        let sect_key;
        let leftN = row_edgeNs[i][0];
        let rightN = row_edgeNs[i][1];
        
        let sect_matches = Object.fromEntries(Object.entries(prev_edgeNs).filter(([k,v]) => v[0] <= rightN && v[1] >= leftN));

        let match_keys = Object.keys(sect_matches);
        if (match_keys.length) { // could be multiple prev sections merging, or just one (if length === 1)
          leftover_prev_edgeNs = Object.fromEntries(Object.entries(leftover_prev_edgeNs).filter(([k,v]) => !Object.keys(sect_matches).includes(k)));

          for (let s=0; s<match_keys.length; ++s) {
            let prevNs = sect_matches[match_keys[s]];
            let prev_leftN = prevNs[0];
            let prev_rightN = prevNs[1];

            let next_sect_leftN = row_code.indexOf(1, rightN); // search for next indication of a section in the current row

            let last_overlap = (next_sect_leftN === -1 || next_sect_leftN+1 > prev_rightN);
            if (s === 0) { // no overlapping match before this
              let match_children = sect_track[match_keys[s]].children;
              let children_keys = Object.keys(match_children);

              if (!children_keys.length) { // no section before this
                if (match_keys.length === 1 && last_overlap) sect_key = match_keys[s]; // if no more upcoming sections or next section doesn't overlap with this match, just consider this current section to be a continuation of the match
                trackShaping('left', prev_leftN, leftN, sect_shaping);
              } else { // section before this, track as shaping between that section's right needle+1 (as left needle) and this section's left needle (as right needle)
                let prev_sect_rightN = match_children[children_keys[children_keys.length-1]][1];
                trackShaping('left', prev_sect_rightN, leftN, sect_shaping); //row_shaping);
              }

              if (sect_key === undefined) { // consider it to be a new section, with "parent" sections
                sect_key = sect_idx;
                sect_track[sect_key] = new Section(sect_idx);
                sect_track[sect_key].parents.push(match_keys[s]); // save this overlapping section as a "parent"
                sect_track[match_keys[s]].children[sect_key] = [leftN, rightN]; // .push(sect_key);
                sect_idx += 1;
              }

              row_sect_track[sect_key] = [leftN, rightN];
              sect_track[sect_key].edgeNs[r] = [leftN, rightN];
            } else { // let's see if there is an increase (merging of two sections)
              sect_track[sect_key].parents[match_keys[s]].push(match_keys[s]); // save this overlapping section as a "parent"
              sect_track[match_keys[s]].children[sect_key] = [leftN, rightN];

              let leftN_ = [match_keys[s-1]][1]+1;
              trackShaping('left', prev_leftN, leftN_, sect_shaping); //row_shaping);
            }

            if (s === match_keys.length-1) { // no overlapping match after this
              if (last_overlap) trackShaping('right', prev_rightN, rightN, sect_shaping);
            }
          }
        } else { // new section, store it and count its initiation as an increase (really, a caston)
          sect_key = sect_idx;

          sect_track[sect_key] = new Section(sect_key);
          sect_track[sect_key].edgeNs[r] = [leftN, rightN];
          row_sect_track[sect_key] = [leftN, rightN];
          sect_idx += 1;

          let count = rightN-leftN+1; //TODO: make sure everything is ok with +1 for others
          sect_shaping[leftN] = new Shaping('increase', 'left', count, rightN, leftN, '+'); //TODO: make this 'caston' instead of 'increase' //?
          sect_shaping[rightN] = new Shaping('increase', 'right', count, leftN, rightN, '+');
        }

        row_shaping[sect_key] = sect_shaping;
      }

      if (leftover_prev_edgeNs.length) { // we need to bind these off (do it in preview row)
        for (let edgeNs of leftover_prev_edgeNs) {
          let prev_leftN = edgeNs[0];
          let prev_rightN = edgeNs[1];

          let count = prev_rightN-prev_leftN+1; //TODO: make sure everything is ok with +1 for others

          shaping[shaping.length-1][prev_leftN-1] = new Shaping('bindoff', 'left', count, prev_leftN, prev_rightN, '-');
          shaping[shaping.length-1][prev_rightN+1] = new Shaping('bindoff', 'right', count, prev_rightN, prev_leftN, '+');
        }
      }
    } else {
      for (let sect_key of Object.keys(row_sect_track)) {
        row_shaping[sect_key] = {};
      }
    }

    shaping.push(row_shaping);
    prev_edgeNs = row_sect_track;
    rows_sect_keys.push(Object.keys(row_sect_track));
    rows_edgeNs.push(row_edgeNs);
  }

  return shaping;
}


function insertShaping(shaping, cs, output, row_idx) {
  output.push(new KnitoutOp({comment: `${shaping.type} ${Math.abs(shaping.count)} on ${shaping.side} (${shaping.prevN} => ${shaping.newN})`}));

  if (shaping.type === 'increase') {
    if (shaping.count > MAX_XFER_CT) incMultDoubleBed(shaping.side, shaping.count, shaping.prevN, cs, output);
    else {
      if (twisted_stitches.length) {
        let requiredNs = [['f', shaping.prevN], ['b', shaping.prevN]];

        if (shaping.side === 'left') {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN+1}`, `b${shaping.prevN+1}`);

          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(
                new KnitoutOp({comment: 'twisted stitch !'}), //TODO: //remove '!'
                new KnitoutOp({op: 'miss', d: '-', bn: bn, cs: cs}),
                new KnitoutOp({op: 'knit', d: '+', bn: bn, cs: cs}),
                new KnitoutOp({op: 'miss', d: '-', bn: bn, cs: cs})
              );
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        } else {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN-1}`, `b${shaping.prevN-1}`);
          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(
                new KnitoutOp({comment: 'twisted stitch !'}), //TODO: //remove '!'
                new KnitoutOp({op: 'miss', d: '+', bn: bn, cs: cs}),
                new KnitoutOp({op: 'knit', d: '-', bn: bn, cs: cs}),
                new KnitoutOp({op: 'miss', d: '+', bn: bn, cs: cs})
              );
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        }
      }

      if (shaping.count === 1) twisted_stitches = twisted_stitches.concat(inc1DoubleBed(specs, shaping.side, shaping.prevN, cs, output));
      else if (shaping.count === 2) twisted_stitches = twisted_stitches.concat(inc2DoubleBed(specs, shaping.side, shaping.prevN, cs, output));
    }
  } else if (shaping.type === 'decrease') { //TODO: deal temp fix for kniterate
    if (shaping.count > MAX_XFER_CT) bindoff(specs, shaping.side, shaping.count, shaping.prevN, cs, output, true, []);
    else decDoubleBedTempFix(specs, shaping.side, shaping.count, shaping.prevN, output);
  } else if (shaping.type === 'bindoff') {
    let off_limits = shaping.side === 'left' ? shaping.prevN-1 : shaping.prevN+1;
    bindoff(specs, shaping.side, shaping.count, shaping.prevN, cs, output, false, off_limits);
  }

  let newN_idx = shaping_needles.indexOf(shaping.newN);
  let prevN_idx = shaping_needles.indexOf(shaping.prevN);

  if (newN_idx !== -1) delete shaping_needles[newN_idx];
  if (prevN_idx !== -1) delete shaping_needles[prevN_idx];
}


let yarn_ops = ['in', 'out', 'inhook', 'releasehook', 'outhook'];

function knitoutInfo(ln) {
  ln = ln.trim();

  let info = [];
  let op, d, bn0=[], bn=[], cs=[], param, comment;
  if (ln.includes(';;')) {
    info = ln.split(':');
    op = info[0] + ':';
  } else if (ln.includes(';')) {
    let comment_idx = ln.indexOf(';');
    comment = ln.slice(comment_idx);

    info = ln.slice(0, comment_idx).trim().split(' ');
  } else {
    info = ln.trim().split(' ');
  }

  if (info[0].trim().length) {
    op = info[0];
    if (op === 'rack' || (op.length > 1 && (op.slice(0, 2) === 'x-' || op.slice(0, 2) === ';;'))) {
      param = info[1].trim();
    } else {
      if (yarn_ops.includes(op)) cs = info.slice(1);
      else if (op === 'knit' || op === 'tuck' || op === 'miss' || op === 'split') {
        d = info[1];
        if (op === 'split') {
          bn0 = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
          bn = [info[3].match(/[a-zA-Z]+/)[0], Number(info[3].match(/\d+/)[0])];
          cs = info.slice(4);
        } else {
          bn = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
          cs = info.slice(3);
        }
      } else if (op === 'xfer') {
        bn0 = [info[1].match(/[a-zA-Z]+/)[0], Number(info[1].match(/\d+/)[0])];
        bn = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
      } else if (op === 'drop')  bn = [info[1].match(/[a-zA-Z]+/)[0], Number(info[1].match(/\d+/)[0])]; //info[1];
      else throw new Error(`Unrecognized operation: ${op}.`)
    }
  }

  return new KnitoutOp({op: op, d: d, bn0: bn0, bn: bn, cs: cs, param: param, comment: comment});
}


// check whether a carrier appears in the input piece ever again:
function carrierDone(carrier, row_idx, ln_idx) {
  let arr = row_idx === -1 ? caston_section : rows[row_idx];

  if (ln_idx < arr.length-1) {
    for (let i=ln_idx+1; i<arr.length; ++i) {
      let ln = arr[i];
      let next_op = knitoutInfo(ln);
      if (next_op.cs.includes(carrier)) return false;
    }
  }

  find_next_op: for (let r=row_idx+1; r<rows.length; ++r) {
    for (let ln of rows[r]) {
      let next_op = knitoutInfo(ln);
      if (next_op.cs.includes(carrier)) return false;
    }
  }

  return true; // if nothing found, carrier is done
}


function placeCarrier(d, n, carrier, edgeNs, row_idx, ln_idx, sect_idx) {
  // first check if there is any use in the current row:
  let arr = row_idx === -1 ? caston_section : rows[row_idx];

  let carrier_done = true;
  let [minN, maxN] = edgeNs;

  if (ln_idx < arr.length-1) {
    for (let i=ln_idx+1; i<arr.length; ++i) {
      let ln = arr[i];
      let next_op = knitoutInfo(ln);

      if (next_op.cs.includes(carrier)) {
        console.log('row idx:', row_idx+1); //remove //debug
        if (d === '-' && minN < n) return [minN, false];
        else if (d === '+' && maxN > n) return [maxN, false];
        else return [null, false];
      }
    }
  }

  find_next_op: for (let r=row_idx+1; r<rows.length; ++r) {
    let i = rows_sect_keys[r].indexOf(sect_idx);

    if (i === -1) { // no longer in the row
      if (Object.keys(sect_track[sect_idx].children).some(key => rows_sect_keys[r].includes(key))) carrier_done = false; //TODO: have code for checking if any of the sections that are no longer in use still have carriers store, and if so, add to leftover carriers
      break find_next_op;
    }

    let [leftN, rightN] = rows_edgeNs[r][i];

    if (leftN < minN) minN = leftN;
    if (rightN > maxN) maxN = rightN;

    for (let ln of rows[r]) {
      let next_op = knitoutInfo(ln);
      if (next_op.cs.includes(carrier) && next_op.bn[1] >= leftN && next_op.bn[1] <= rightN) {
        carrier_done = false;
        break find_next_op;
      }
    }
  }

  if (d === '-' && minN < n) return [minN, carrier_done];
  else if (d === '+' && maxN > n) return [maxN, carrier_done];
  else return [null, carrier_done];
}


function cookieCutter(row, edgeNs, row_shaping, row_idx, sect_idx) {
  let output = [];

  let skip_args = undefined;
  let [leftN, rightN] = edgeNs;

  let k_args = {
    'd': undefined,
    'bn': [],
    'cs': [],
  };

  row_loop: for (let r=0; r<row.length; ++r) { //TODO: filter out any extensions/racks that don't work here
    let to_drop = [];
    let shape_info;
    let doneCs = [];
    let op_n;
    let miss_op;
    let skip = false;
    let iter_output = [];
    let replace_cs = [];

    let ln = row[r];
    let info = knitoutInfo(ln);

    if (k_args.cs.length && ((info.cs.length && !arraysEqual(k_args.cs, info.cs)) || r === row.length-1)) { // might no longer be using the previous carrier, or might need to miss it out of the way
      for (let c of k_args.cs) {
        let sectC = sect_track[sect_idx].carriers[input_carriers.indexOf(c)];

        let [missN, carrier_done] = placeCarrier(k_args.d, k_args.bn[1], c, edgeNs, row_idx, r, sect_idx);

        if (missN !== null) {
          miss_op = new KnitoutOp({op: 'miss', d: k_args.d, bn: ['f', missN], cs: [sectC]});
          carrier_track[sectC].needle = missN;
        }

        if (carrier_done) {
          doneCs.push(sectC);
          carrier_track[sectC].needle = k_args.bn[1];
        }
      }
    }

    if (!info.bn.length) {
      if (!yarn_ops.includes(info.op)) output.push(ln);
    } else {
      if (info.bn0.length) {
        let b0 = info.bn0[0];
        let n0 = info.bn0[1];

        if (n0 < leftN || n0 > rightN) continue;
        else {
          let n0_idx = working_needles[b0].indexOf(n0);
          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
        }
      }

      let b = info.bn[0];
      let n = info.bn[1];

      if (info.cs.length) { //TODO: have option for shaping without cs.length when increasing or decreasing by xfer //?
        if (info.d) k_args.d = info.d;
        k_args.cs = info.cs;

        // update min and max needles of the piece if its the caston:
        if (row_idx === -1 && info.op !== 'miss') {
          if (n < MIN) MIN = n;
          if (n > MAX) MAX = n;
        }

        if (skip_args) { //TODO: adjust this //?
          if (k_args.d !== skip_args.d || !arraysEqual(k_args.cs, skip_args.cs)) skip_args = undefined;
          else skip = true;
        }

        if (!skip && shaping_needles.length) {
          let shapeNs = [];
          
          if (info.d === '+') shapeNs = shaping_needles.filter(el => el < n);
          else shapeNs = shaping_needles.filter(el => el > n); //TODO: determine if need to reverse this

          if (shaping_needles.includes(n)) shapeNs.push(n);

          if (shapeNs.length) {
            for (let shapeN of shapeNs) {
              let shaping = row_shaping[shapeN];

              shape_info = shaping;

              if (!shaping.direction || shaping.direction === info.d) {
                if (shaping.type === 'decrease' && shaping.count > MAX_XFER_CT) {
                  if (shaping.side === 'left' && info.d === '-') { // for multi decrease on left side: if d === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n>=shaping.prevN; --n) {
                      iter_output.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', n], cs: info.cs}));
                    }
                  } else if (shaping.side === 'right' && d === '+') { // for multi decrease on right side: if d === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n<=shaping.prevN; ++n) {
                      iter_output.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', n], cs: info.cs}));
                    }
                  }
                }

                insertShaping(shaping, info.cs, iter_output, row_idx);

                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; // we want to skip all other needles
              }
            }
          }
        }
      }

      if (!skip && n >= leftN && n <= rightN) {
        if (op_n === undefined) op_n = n;
        k_args.bn = info.bn;

        if (!working_needles[b].includes(n)) working_needles[b].push(n);
        if (info.op === 'knit' && twisted_stitches.includes(info.bn)) { //TODO: adjust this //?
          if (info.d === '+') {
            iter_output.push(
              new KnitoutOp({comment: 'twisted stitch'}),
              new KnitoutOp({op: 'miss', d: '+', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'knit', d: '-', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'miss', d: '+', bn: info.bn, cs: info.cs})
            );
          } else {
            iter_output.push(
              new KnitoutOp({comment: 'twisted stitch'}),
              new KnitoutOp({op: 'miss', d: '-', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'knit', d: '+', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'miss', d: '-', bn: info.bn, cs: info.cs})
            );
          }
          twisted_stitches.splice(twisted_stitches.indexOf(info.bn), 1);
        } else {
          //TODO: insert miss before shaping, if decrease //?
          // TODO: if increase by split, remove op
          if (shape_info && shape_info.type === 'decrease' && ((shape_info.side === 'right' && info.d === '+') || (shape_info.side === 'left' && info.d === '-'))) iter_output.unshift(info); // insert ln before decrease on right && d === '+' or decrease on left && d === '-'
          else iter_output.push(info);
        }
      }

      if (info.cs.length && iter_output.length) { // replace the carriers
        let new_cs = []
        for (let c of info.cs) {
          let sectC;
          let c_idx = input_carriers.indexOf(c);

          if (c_idx === -1) { // new carrier
            new_cs.push(c);

            leftover_carriers.splice(leftover_carriers.indexOf(c), 1);
            input_carriers.push(c);
            c_idx = input_carriers.length-1;

            for (let i=sect_track[sect_idx].carriers.length; i<=c_idx; ++i) {
              sect_track[sect_idx].carriers.push(undefined);
            }

            sectC = c;
            sect_track[sect_idx].carriers[c_idx] = sectC; // would start undefined since it would be addressed in the for loop above
          } else {
            sectC = sect_track[sect_idx].carriers[c_idx];

            if (sectC === undefined) { // an alternative carrier has not been defined yet
              let c_dist = 0;
              for (let i=sect_track[sect_idx].carriers.length; i<=c_idx; ++i) { // make any carriers that aren't included in this section undefined 
                sect_track[sect_idx].carriers.push(undefined);
              }

              if (sect_track[sect_idx].parents.length) { // we could potential get some carriers from a parent section that just finished to reuse
                find_replacement: for (let p_key of sect_track[sect_idx].parents) {
                  let replaceC = sect_track[p_key].carriers[c_idx];

                  if (sect_track[sect_idx].carriers.includes(replaceC)) continue;

                  if (replaceC !== undefined) {
                    let replaceC_park = carrier_track[replaceC].needle;
                    let n_idx = (carrier_track[replaceC].direction === '-' ? 0 : 1);
                    let children = sect_track[p_key].children;

                    let [closest_child, child_dist] = Object.entries(children).reduce((min, entry) => {
                      let child_n = entry[1][n_idx];
                      let dist = Math.abs(child_n-replaceC_park);
                      return dist < min[1] ? [entry[0], dist] : min;
                    }, [undefined, Infinity]);

                    // console.log('details:', row_idx, replaceC, n, info.d, carrier_track[replaceC], children, leftN, rightN, sect_idx, closest_child, leftover_carriers); //remove //debug

                    if (sect_idx == closest_child) {
                      c_dist = child_dist;
                      sectC = replaceC;
                      sect_track[sect_idx].carriers[c_idx] = sectC;// would start undefined since it would be addressed in the for loop above
                      sect_track[p_key].carriers[c_idx] = undefined;

                      let leftover_idx = leftover_carriers.indexOf(sectC);
                      if (leftover_idx !== -1) leftover_carriers.splice(leftover_idx, 1);
                      break find_replacement;
                    }
                  }

                  // see if any carriers are done being in use:
                  for (let i=0; i<sect_track[p_key].carriers.length; ++i) {
                    let c = sect_track[p_key].carriers[i];
                    if (c !== undefined) {
                      if (carrierDone(input_carriers[i], row_idx, r)) {
                        leftover_carriers.push(c);
                        sect_track[p_key].carriers[i] = undefined;
                      }
                    }
                  }
                }
              }

              if (sectC === undefined) { // if still no good match, find closest one
                let dists = leftover_carriers.map(car => Math.abs(carrier_track[car].needle - n));
                c_dist = Math.min(...dists);
                let new_c_idx = dists.indexOf(c_dist);
                sectC = leftover_carriers.splice(new_c_idx, 1)[0];

                sect_track[sect_idx].carriers[c_idx] = sectC; // would start undefined since it would be addressed in the for loop above

                if (carrier_track[sectC].row === undefined) new_cs.push(sectC);
              }

              if (c_dist >= MIN_FLOAT_DIST) {
                let sectC_n = carrier_track[sectC].needle;
                if (new_cs.includes(sectC)) {
                  output.push(`${specs.in_op} ${sectC}`);

                  if (sectC_n < n) {
                    let firstN = row_idx === -1 ? rows_edgeNs[0][0][0] : rows_edgeNs[row_idx][0][0];

                    if (sectC_n < firstN) firstN = sectC_n;
                    to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '+', 'f', sectC, output));
                  } else {
                    let firstN = row_idx === -1 ? rows_edgeNs[0][rows_edgeNs[row_idx].length-1][1] : rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1];

                    if (sectC_n > firstN) firstN = sectC_n;

                    to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '-', 'f', sectC, output));
                  }

                  if (specs.machine.includes('swg')) output.push(`releasehook ${sectC}`);

                  new_cs.splice(new_cs.indexOf(sectC), 1);
                }
                if (sectC_n < n) {
                  for (let n_=sectC_n; n_<n; ++n_) {
                    if (!working_needles['b'].includes(n_)) {
                      output.push(`tuck + b${n_} ${sectC}`);
                      to_drop.push(['b', n_]);
                    } else output.push(`knit + b${n_} ${sectC}`);
                  }

                  if (info.d === '-') output.push(`miss + b${n} ${sectC}`);
                } else {
                  for (let n_=sectC_n; n_>n; --n_) {
                    if (!working_needles['b'].includes(n_)) {
                      output.push(`tuck - b${n_} ${sectC}`);
                      to_drop.push(['b', n_]);
                    } else output.push(`knit - b${n_} ${sectC}`);
                  }

                  if (info.d === '+') output.push(`miss - b${n} ${sectC}`);
                }

                console.log(`need to place carrier, ${sectC}, since it is ${c_dist} needles away from working needle, ${n}.`); //debug
              }
              if (specs.visColors[c]) output.push(`x-vis-color ${specs.visColors[c]} ${sectC}`);
            }
          }

          if (sectC === undefined) throw new Error('sectC undefined.  leftover_carriers:', leftover_carriers); //debug

          replace_cs.push(sectC);

          carrier_track[sectC].row = row_idx;
          if (info.d) carrier_track[sectC].direction = info.d;
          if (op_n !== undefined) carrier_track[sectC].needle = op_n;
        }

        if (new_cs.length) {
          output.push(`${specs.in_op} ${new_cs.join(' ')}`);
          
          for (let sectC of new_cs) {
            if (info.d === '+') {
              let firstN = row_idx === -1 ? rows_edgeNs[0][0][0] : rows_edgeNs[row_idx][0][0];

              to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '+', 'f', sectC, output));
            } else {
              let firstN = row_idx === -1 ? rows_edgeNs[0][rows_edgeNs[row_idx].length-1][1] : rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1];

              to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '-', 'f', sectC, output));
            }
          }

          if (specs.machine.includes('swg')) output.push(`releasehook ${new_cs.join(' ')}`); //TODO: maybe move releasehook to after there is more knitting //?
        }
      }
    }

    if (miss_op) iter_output.push(miss_op); //TODO: decide if should insert this before shaping
    
    if (iter_output.length) {
      iter_output.forEach(k_op => {
        if (replace_cs.length && arraysEqual(k_op.cs, info.cs)) k_op.replaceArgs({'cs': replace_cs});
        k_op.generateCode(output);
      });
    }

    if (to_drop.length) {
      for (let bn_ of to_drop) {
        output.push(`drop ${bn_.join('')}`);
      }
    }

    if (doneCs.length && row_idx < rows.length-1) {
      for (let c of doneCs) {
        let c_idx = sect_track[sect_idx].carriers.indexOf(c);
        sect_track[sect_idx].carriers[c_idx] = undefined;
        leftover_carriers.unshift(c);
      }
    }
  }

  return output;
}


function generateKnitout(file_content, shape_code, machine, carriers, inc_method, visColors) {
  specs.machine = machine;
  specs.carriers = carriers;
  specs.inc_method = inc_method;
  specs.visColors = visColors;

  if (specs.machine === 'kniterate') {
    specs.in_op = 'in';
    specs.out_op = 'out';
  } else {
    specs.in_op = 'inhook';
    specs.out_op = 'outhook';
  }

  leftover_carriers = [...specs.carriers];

  [header_section, caston_section, rows, bindoff_section] = rowsArray(file_content);

  let out_park = specs.machine === 'kniterate' ? -Infinity : Infinity; // this means they all start off the needle bed (parity determined by where carriers are parked when they're out)
  for (let c of specs.carriers) {
    carrier_track[c] = new Carrier({needle: out_park});
  }

  let output = header_section;

  let shaping = determineShaping(shape_code);
  
  for (let r=0; r<rows.length; ++r) {
    output.push(`;row: ${r+1}`);

    let eligible_needles = [];
    for (let edgeNs of rows_edgeNs[r]) {
      for (let n=edgeNs[0]; n<=edgeNs[1]; ++n) {
        eligible_needles.push(n);
      }
    }

    for (let b of Object.keys(working_needles)) {
      working_needles[b] = working_needles[b].filter(n => eligible_needles.includes(n));
    }

    let sect_ct = rows_edgeNs[r].length;

    let sect_keys = rows_sect_keys[r];

    for (let i=0; i<sect_keys.length; ++i) {
      let sect_key = sect_keys[i];

      shaping_needles = Object.keys(shaping[r][sect_key]).map(Number);

      if (sect_ct > 1) output.push(`;section: ${i+1}/${sect_ct}`);

      if (r === 0) {
        output = output.concat(cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r][sect_key], -1, sect_key)); // caston (row_idx === -1 indicates that this is the caston)
        
        // update `out_park` so out carriers are weighted over nearby carriers that are on incorrect side when finding `replace_cs`: 
        out_park = specs.machine === 'kniterate' ? MIN-1 : MAX+1;
        for (let c of leftover_carriers) {
          carrier_track[c].needle = out_park;
        }
      }

      output = output.concat(cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r][sect_key], r, sect_key));
    }

    if (r > 0) {
      let done_sects = rows_sect_keys[r-1].filter(key => !sect_keys.includes(key));
      if (done_sects.length) {
        for (let sect_key of done_sects) {
          leftover_carriers = leftover_carriers.concat(sect_track[sect_key].carriers.filter(c => c !== undefined));
        }
      }
    }
  }

  let bindoff_ln = bindoff_section.find(ln => ln.includes('knit '));

  if (bindoff_ln) {
    let edgeN = specs.machine === 'kniterate' ? rows_edgeNs[rows.length-1][0][0] : rows_edgeNs[rows.length-1][rows_edgeNs[row_idx].length-1][1];

    let bindoff_output = [];
    output.push(';bindoff section');
    
    let info = knitoutInfo(bindoff_ln);
    let bindoff_carrier = info.cs[0];

    let last_sect_keys = rows_sect_keys[rows.length-1];

    for (let i=0; i<last_sect_keys.length; ++i) {
      let sect_key = last_sect_keys[i];
      let c_idx = input_carriers.indexOf(bindoff_carrier);
      let bindC = sect_track[sect_key].carriers[c_idx];

      for (let c of sect_track[sect_key].carriers[c_idx]) {
        if (c === undefined) continue;
        else {
          if (bindC === undefined) bindC = c;

          if (c !== bindC && ((specs.machine === 'kniterate' && carrier_track[c].needle <= edgeN) || (specs.machine.includes('swg') && carrier_track[c].needle >= edgeN))) {
            output.push(`${specs.out_op} ${c}`);
            delete carrier_track[c];
          }
        }
      }

      let bindoff_edgeNs = rows_edgeNs[rows.length-1][i]; //TODO: do this for each section, if applicable
      let bindoff_count = bindoff_edgeNs[1]- bindoff_edgeNs[0]+1;
      let bindoff_side, bindoffN, last_needle;

      if (carrier_track[bindC].direction === '-') {
        bindoff_side = 'left';
        bindoffN = bindoff_edgeNs[0];
        last_needle = bindoff_edgeNs[1];
      } else {
        bindoff_side = 'right';
        bindoffN = bindoff_edgeNs[1];
        last_needle = bindoff_edgeNs[0];
      }

      bindoff(specs, bindoff_side, bindoff_count, bindoffN, bindC, bindoff_output, false, []);

      if (i === last_sect_keys.length-1) {
        bindoff_output.push(new KnitoutOp({op: specs.out_op, cs: [bindC]}));
        delete carrier_track[bindC];
      }

      bindoff_output.push(new KnitoutOp({op: 'drop', bn: ['b', last_needle]})); //TODO: maybe knit tag instead so less likely to unravel
    }

    bindoff_output.forEach(k_op => {
      k_op.generateCode(output);
    });
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

  for (let c of specs.carriers) {
    if (Object.keys(carrier_track).includes(c)) output.push(`${specs.out_op} ${c}`); //TODO: take out any that are to to the side of the bindoff carrier first
  }
  
	let final_file = JSON.stringify(output).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
	final_file = final_file.join('\n');
  return final_file;
}


module.exports = { generateKnitout };

