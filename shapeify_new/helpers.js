let temp_fix = true; //TODO: deal with this on the machine

//------------------------------
//--- INCREASING FUNCTIONS ---//
//------------------------------
const inc1DoubleBed = (specs, side, prevN, carrier, arr) => { //TODO: make it so won't increase on needles that are meant to be empty
  let twisted_stitches = [];
  if (!specs) specs = {'machine': 'swgn2', 'inc_method': 'split'};

  if (side === 'left') {
    if (specs.inc_method === 'xfer') { //TODO: add code for twisted stitch in main code
      arr.push('rack -1');
      arr.push(`xfer b${prevN} f${prevN - 1}`);
      arr.push('rack 0');
      if (specs.machine === 'kniterate') arr.push('x-add-roller-advance -100');
      arr.push(`miss + f${prevN} ${carrier}`); // ensures/forces order of xfers that is least likely to drop stitches
      arr.push(`xfer f${prevN} b${prevN}`);
      arr.push(`xfer f${prevN - 1} b${prevN - 1}`);
      arr.push('rack -1');
      arr.push(`xfer b${prevN} f${prevN - 1}`);
      // twist = 1;
      arr.push('rack 0');
      arr.push(`miss - f${prevN-1} ${carrier}`); //miss carrier out of the way

      // twisted_stitches.push(`f${prevN}`, `b${prevN}`);
    } else if (specs.inc_method === 'split') {
      // TODO: remember what low speed is for swgn2
      if (specs.split_speedNumber) arr.push(`x-speed-number ${specs.split_speedNumber}`);

      if (specs.machine === 'kniterate' && temp_fix) {
        arr.push('rack -1');
        arr.push(`split + b${prevN} f${prevN-1} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + f${prevN-1} b${prevN-1} ${carrier}`);
      } else {
        arr.push('rack 1');
        arr.push(`split + f${prevN} b${prevN-1} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + b${prevN-1} f${prevN-1} ${carrier}`);
      } //^

      // arr.push('rack 1'); //go back! //v
      // arr.push(`split + f${prevN} b${prevN-1} ${carrier}`);
      // arr.push('rack 0');
      // arr.push(`split + b${prevN-1} f${prevN-1} ${carrier}`); //^
      arr.push(`miss - f${prevN-1} ${carrier}`); //miss carrier out of the way

      if (specs.speedNumber) arr.push(`x-speed-number ${specs.speedNumber}`); //reset it
    } else { //twisted-stitch
      arr.push(`miss - f${prevN-1} ${carrier}`);
      arr.push(`knit + f${prevN-1} ${carrier}`);
      arr.push(`miss - b${prevN-1} ${carrier}`);
      arr.push(`knit + b${prevN-1} ${carrier}`);
      arr.push(`miss - f${prevN-1} ${carrier}`);
      // twist = 0;
      twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`);
    }
    // LtwistedF = true;
    // LtwistedB = true;
  } else if (side === 'right') {
    if (specs.inc_method === 'xfer') {
      arr.push('rack 1');
      arr.push(`xfer b${prevN} f${prevN + 1}`);
      arr.push('rack 0');
      if (specs.machine === 'kniterate') arr.push('x-add-roller-advance -100');
      arr.push(`miss - f${prevN} ${carrier}`); // ensures/forces order of xfers that is least likely to drop stitches
      arr.push(`xfer f${prevN} b${prevN}`);
      arr.push(`xfer f${prevN + 1} b${prevN + 1}`);
      arr.push('rack 1');
      arr.push(`xfer b${prevN} f${prevN + 1}`);
      // twist = 1;
      arr.push('rack 0');
      arr.push(`miss + f${prevN+1} ${carrier}`); //miss carrier out of the way
      // twisted_stitches.push(`f${prevN}`, `b${prevN}`);
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(`x-speed-number ${specs.split_speedNumber}`);
      arr.push('rack -1');
      arr.push(`split - f${prevN} b${prevN+1} ${carrier}`);
      arr.push('rack 0');
      arr.push(`split - b${prevN+1} f${prevN+1} ${carrier}`);
      arr.push(`miss + f${prevN+1} ${carrier}`); //miss carrier out of the way

      if (specs.speedNumber) arr.push(`x-speed-number ${specs.speedNumber}`); //reset it
    } else { // twisted stitch //TODO: return this in twisted stitches instead //?
      arr.push(`miss + f${prevN+1} ${carrier}`);
      arr.push(`knit - f${prevN+1} ${carrier}`);
      arr.push(`miss + b${prevN+1} ${carrier}`);
      arr.push(`knit - b${prevN+1} ${carrier}`);
      arr.push(`miss + f${prevN+1} ${carrier}`);
      // twist = 0;

     twisted_stitches.push(`f${prevN+1}`, `b${prevN+1}`);
    }
  // } else if (side === 'both') { //TODO: add option for inc by split for here
  /*
  } else if (side === 'both' && specs.inc_method !== 'split') {
    LtwistedF = true;
    LtwistedB = true;
    RtwistedF = true;
    RtwistedB = true;
    twist = 0;
  }

  if (specs.inc_method === 'split') { //TODO: make sure this doesn't mess anything up for if different inc method on other side
    LtwistedF = false, LtwistedB = false, RtwistedF = false, RtwistedB = false;
    twist = undefined;
  }
  */
  }

  if (specs.inc_method === 'xfer') twisted_stitches.push(`f${prevN}`, `b${prevN}`);

  return twisted_stitches;
}


const inc2DoubleBed = (specs, side, prevN, carrier, arr) => { //TODO: fix this for split
  let twisted_stitches = [];
  if (!specs) specs = {'machine': 'swgn2', 'inc_method': 'split'};

  if (side === 'left') {
    if (specs.inc_method === 'xfer') {
      arr.push(`miss - f${prevN - 2} ${carrier}`); //miss carrier out of the way

      arr.push('rack -1');
      arr.push(`xfer b${prevN} f${prevN-1}`);
      arr.push('rack 1');
      arr.push(`xfer f${prevN-1} b${prevN-2}`);
      arr.push(`xfer f${prevN+1} b${prevN}`);
      arr.push('rack 0');
      arr.push(`xfer b${prevN-2} f${prevN-2}`);
      arr.push('rack -1');
      arr.push(`xfer b${prevN} f${prevN-1}`);
      arr.push('rack 0');
      arr.push(`xfer b${prevN+1} f${prevN+1}`);
      arr.push('rack 1');
      arr.push(`xfer f${prevN-1} b${prevN-2}`);
      arr.push(`xfer f${prevN+1} b${prevN}`);
      // twist = 1;
      arr.push('rack 0');
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(`x-speed-number ${specs.split_speedNumber}`);

      if (specs.machine === 'kniterate' && temp_fix) { //TODO: //remove //temp //v
        arr.push('rack -1');
        arr.push(`split + b${prevN} f${prevN-1} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + f${prevN-1} b${prevN-1} ${carrier}`);

        arr.push('rack -1');
        arr.push(`split + b${prevN-1} f${prevN-2} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + f${prevN-2} b${prevN-2} ${carrier}`);
      } else {
        arr.push('rack 1');
        arr.push(`split + f${prevN} b${prevN-1} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + b${prevN-1} f${prevN-1} ${carrier}`);

        arr.push('rack 1');
        arr.push(`split + f${prevN-1} b${prevN-2} ${carrier}`);
        arr.push('rack 0');
        arr.push(`split + b${prevN-2} f${prevN-2} ${carrier}`);
      } //^

      // arr.push('rack 1'); //go back! //v
      // arr.push(`split + f${prevN} b${prevN-1} ${carrier}`);
      // arr.push('rack 0');
      // arr.push(`split + b${prevN-1} f${prevN-1} ${carrier}`);

      // arr.push('rack 1');
      // arr.push(`split + f${prevN-1} b${prevN-2} ${carrier}`);
      // arr.push('rack 0');
      // arr.push(`split + b${prevN-2} f${prevN-2} ${carrier}`); //^

      arr.push(`miss - f${prevN-2} ${carrier}`); //miss carrier out of the way

      if (specs.speedNumber) arr.push(`x-speed-number ${specs.speedNumber}`);
    } else { // twisted stitch
      arr.push(`miss - f${prevN-1} ${carrier}`);
      arr.push(`knit + f${prevN-1} ${carrier}`);
      arr.push(`miss - b${prevN-1} ${carrier}`);
      arr.push(`knit + b${prevN-1} ${carrier}`);

      arr.push(`miss - f${prevN-2} ${carrier}`);
      arr.push(`knit + f${prevN-2} ${carrier}`);
      arr.push(`miss - b${prevN-1} ${carrier}`);
      arr.push(`knit + b${prevN-1} ${carrier}`);
      arr.push(`miss - f${prevN-1} ${carrier}`);

      arr.push(`miss - f${prevN-1} ${carrier}`);

      twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`, `f${prevN-2}`, `b${prevN-2}`);
      // twist = 0;
    }
    // LtwistedF = true;
    // LtwistedB = true;
  } else if (side === 'right') {
    if (specs.inc_method === 'xfer') {
      arr.push(`miss + f${prevN+2} ${carrier}`); //miss carrier out of the way

      arr.push('rack 1');
      arr.push(`xfer b${prevN} f${prevN+1}`);
      arr.push('rack -1');
      arr.push(`xfer f${prevN-1} b${prevN}`);
      arr.push(`xfer f${prevN+1} b${prevN+2}`);
      arr.push('rack 0');
      arr.push(`xfer b${prevN+2} f${prevN+2}`);
      arr.push('rack 1');
      arr.push(`xfer b${prevN} f${prevN+1}`);
      arr.push('rack 0');
      arr.push(`xfer b${prevN-1} f${prevN-1}`);
      arr.push('rack -1');
      arr.push(`xfer f${prevN-1} b${prevN}`);
      arr.push(`xfer f${prevN+1} b${prevN+2}`);

      arr.push('rack 0');
      // twist = 1;

      /* twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`, `f${prevN+1}`, `b${prevN-1}`); */
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(`x-speed-number ${specs.split_speedNumber}`);
      
      arr.push('rack -1');
      arr.push(`split - f${prevN} b${prevN+1} ${carrier}`);
      arr.push('rack 0');
      arr.push(`split - b${prevN+1} f${prevN+1} ${carrier}`);

      arr.push('rack -1');
      arr.push(`split - f${prevN+1} b${prevN+2} ${carrier}`);
      arr.push('rack 0');
      arr.push(`split - b${prevN+2} f${prevN+2} ${carrier}`);

      arr.push(`miss + f${prevN+2} ${carrier}`); // miss carrier out of the way

      if (specs.speedNumber) arr.push(`x-speed-number ${specs.speedNumber}`); // reset it
    } else { // twisted stitch
      arr.push(`miss + f${prevN+1} ${carrier}`);
      arr.push(`knit - f${prevN+1} ${carrier}`);
      arr.push(`miss + b${prevN+1} ${carrier}`);
      arr.push(`knit - b${prevN+1} ${carrier}`);

      arr.push(`miss + f${prevN+2} ${carrier}`);
      arr.push(`knit - f${prevN+2} ${carrier}`);
      arr.push(`miss + b${prevN+2} ${carrier}`);
      arr.push(`knit - b${prevN+2} ${carrier}`);
      arr.push(`miss + f${prevN+2} ${carrier}`);

    twisted_stitches.push(`f${prevN+1}`, `b${prevN+1}`, `f${prevN+2}`, `b${prevN+2}`);
      // twist = 0;
    }
    // RtwistedF = true;
    // RtwistedB = true;
  }

  /*
  if (specs.inc_method === 'split') {
    LtwistedF = false, LtwistedB = false, RtwistedF = false, RtwistedB = false;
    twist = undefined;
  } else arr.push('rack 0');
  */
 if (specs.inc_method === 'xfer') twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`, `f${prevN+1}`, `b${prevN+1}`);

 return twisted_stitches;
}


const incMultDoubleBed = (side, count, prevN, carrier, arr) => {
  arr.push('rack 0.25'); //half rack
  if (side === 'left') {
    for (let n = prevN-1; n >= prevN-count; --n) {
      arr.push(`knit - b${n} ${carrier}`);
      arr.push(`knit - f${n} ${carrier}`); //TODO: determine carrier
    }
  } else if (side === 'right') {
    for (let n = prevN+1; n <= prevN+count; ++n) {
      arr.push(`knit + f${n} ${carrier}`);
      arr.push(`knit + b${n} ${carrier}`);
    }
  }
  arr.push('rack 0');
}


//------------------------------
//--- DECREASING FUNCTIONS ---//
//------------------------------
const decDoubleBedTempFix = (specs, side, count, prevN, arr) => { //temp
  if (!specs) specs = {'machine': 'swgn2'};

  if (count <= 2) {
    if (specs.machine === 'kniterate') arr.push('x-add-roller-advance 150');

    if (side === 'left') {
      arr.push(`xfer b${prevN} f${prevN}`);
      arr.push(`xfer b${prevN+1} f${prevN+1}`);
      if (count === 2) arr.push(`xfer b${prevN+2} f${prevN+2}`);

      arr.push('rack -1');

      if (specs.machine === 'kniterate') arr.push('x-add-roller-advance 100');

      arr.push(`xfer f${prevN} b${prevN+1}`);
      if (count === 2) {
        arr.push(`xfer f${prevN+1} b${prevN+2}`);

        arr.push('rack 0');
        arr.push(`xfer b${prevN+1} f${prevN+1}`);
        arr.push('rack -1');
        arr.push(`xfer f${prevN+1} b${prevN+2}`);
      }
    }
    if (side === 'right') { //side === 'right'
      arr.push(`xfer f${prevN} b${prevN}`);
      arr.push(`xfer f${prevN-1} b${prevN-1}`);
      if (count === 2) arr.push(`xfer f${prevN-2} b${prevN-2}`);

      arr.push('rack -1');

      if (specs.machine === 'kniterate') arr.push('x-add-roller-advance 100');

      arr.push(`xfer b${prevN} f${prevN-1}`);
      if (count === 2) {
        arr.push(`xfer b${prevN-1} f${prevN-2}`);

        arr.push('rack 0');
        arr.push(`xfer f${prevN-1} b${prevN-1}`);
        arr.push('rack -1');
        arr.push(`xfer b${prevN-1} f${prevN-2}`);
      }
    }
    arr.push('rack 0');
  } else throw Error(`ERROR: should not use this function for dec > 2 (invalid count of ${count})`);
}


function bindoff(specs, side, count, prevN, carrier, arr, as_dec_method, off_limits) {
  if (!specs) specs = {'machine': 'swgn2'};
  if (!off_limits) off_limits = [];

  if (specs.stitchNumber) {
    arr.push(`x-stitch-number ${specs.stitchNumber}`); //TODO: reset stitch number after //?
    if (specs.machine === 'kniterate') arr.push(`x-xfer-stitch-number ${Math.ceil(specs.stitchNumber/2)}`);
  } if (specs.speedNumber) arr.push(`x-speed-number ${specs.speedNumber}`);

  // arr.push(';bindoff section', `x-stitch-number ${main_stitch_number}`, `x-speed-number ${xfer_speed}`); //
  if (specs.machine === 'kniterate' && as_dec_method) arr.push('x-roller-advance 100');

  // let count = last_needle;

  let leftN, rightN;
  if (side === 'left') {
    leftN = prevN;
    rightN = prevN+count-1;
  } else {
    leftN = prevN-count+1;
    rightN = prevN;
  }

  const posLoop = (op, bed) => {
    pos: for (let n=leftN; n<=rightN; ++n) {
      if (op === 'knit') {
        arr.push(`knit + ${bed}${n} ${carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        arr.push(`xfer ${bed}${n} ${receive}${n}`);
      }
      if (op === 'bind') {
        if (n === rightN) break pos;
        
        arr.push(`xfer b${n} f${n}`);
        arr.push('rack -1');
        
        arr.push(`xfer f${n} b${n+1}`);
        arr.push('rack 0');
        if (n !== rightN) {
          if (specs.machine === 'kniterate' && n > leftN+3) { //new
            if ((n-leftN) < 60) arr.push('x-add-roller-advance -50');
            else if ((n-leftN) === 60) arr.push('x-roller-advance 0');
          }
          arr.push(`drop b${n-1}`);
        }
        if (specs.machine === 'kniterate' && (n-leftN) >= 60) arr.push('x-add-roller-advance 50'); //new
        arr.push(`knit + b${n+1} ${carrier}`);
        if (n < leftN+count-2) arr.push(`tuck - b${n} ${carrier}`);
        if (n === leftN+3 && !off_limits.includes(leftN-1)) arr.push(`drop b${leftN-1}`); //don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security)
      }
    }
  }

  const negLoop = (op, bed) => {
    neg: for (let n=rightN; n >= leftN; --n) {
      if (op === 'knit') {
        arr.push(`knit - ${bed}${n} ${carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        arr.push(`xfer ${bed}${n} ${receive}${n}`);
      }
      if (op === 'bind') {
        if (n === leftN) break neg;
        
        arr.push(`xfer b${n} f${n}`);
        arr.push('rack 1');
        arr.push(`xfer f${n} b${n-1}`);
        arr.push('rack 0');

        if (n !== rightN) {
          if (specs.machine === 'kniterate' && n < leftN+count-4) { //new
            if (leftN+count-n < 60) arr.push('x-add-roller-advance -50');
            else if (leftN+count-n === 60) arr.push('x-roller-advance 0');
          }
          arr.push(`drop b${n+1}`);
        }

        if (specs.machine === 'kniterate' && leftN+count-n >= 60) arr.push('x-add-roller-advance 50'); //new
        arr.push(`knit - b${n-1} ${carrier}`);
        if (n > leftN+1) arr.push(`tuck + b${n} ${carrier}`);
        if (n === leftN+count-4 && !off_limits.includes(rightN+1)) arr.push(`drop b${rightN+1}`); //don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security)
      }
    }
  }

  const bindoffTail = (last_needle, dir) => {
    arr.push(';tail');
    let otherT_dir, miss1, miss2;
    dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle+1), (miss2 = last_needle-1)) : ((otherT_dir = '+'), (miss1 = last_needle-1), (miss2 = last_needle+1));
    if (specs.machine === 'kniterate') arr.push('x-roller-advance 200');
    arr.push(`miss ${dir} b${miss1} ${carrier}`);
    arr.push('pause tail?');
    for (let i = 0; i < 6; ++i) {
      arr.push(`knit ${otherT_dir} b${last_needle} ${carrier}`);
      arr.push(`miss ${otherT_dir} b${miss2} ${carrier}`);
      arr.push(`knit ${dir} b${last_needle} ${carrier}`);
      arr.push(`miss ${dir} b${miss1} ${carrier}`);
    }
    if (specs.machine === 'kniterate') arr.push('x-add-roller-advance 200'); //new
    arr.push(`drop b${last_needle}`);
  }
  
  if (side === 'left') {
    if (!as_dec_method) {
      posLoop('knit', 'f');
      negLoop('knit', 'b');
    }
    negLoop('xfer', 'f');

    if (specs.machine === 'kniterate') { //TODO: make sure this is reset if necessary
      arr.push('x-roller-advance 50');
      arr.push('x-add-roller-advance -50');
    }
    if (!off_limits.includes(leftN-1)) arr.push(`tuck - b${leftN-1} ${carrier}`); //TODO: don't have it do this if shortrowing (or maybe just don't drop it //?)
    arr.push(`knit + b${leftN} ${carrier}`);
    arr.push(`knit + b${leftN+1} ${carrier}`); //hm....

    posLoop('bind', null);

    if (rightN <= leftN+3 && !off_limits.includes(leftN-1)) arr.push(`drop b${leftN-1}`); // wasn't dropped earlier

    if (!as_dec_method) bindoffTail(rightN, '+');
  } else if (side === 'right') {
    if (!as_dec_method) {
      negLoop('knit', 'f');
      posLoop('knit', 'b');
    }

    posLoop('xfer', 'f');
  
    if (specs.machine === 'kniterate') { //new
      arr.push('x-roller-advance 50');
      arr.push('x-add-roller-advance -50');
    }
    if (!off_limits.includes(rightN+1)) arr.push(`tuck + b${rightN+1} ${carrier}`);
    arr.push(`knit - b${rightN} ${carrier}`);
    arr.push(`knit - b${rightN-1} ${carrier}`);

    negLoop('bind', null);
    // n === leftN+count-4
    if (count <= 4 && !off_limits.includes(rightN+1)) arr.push(`drop b${rightN+1}`); // wasn't dropped earlier

    if (!as_dec_method) bindoffTail(leftN, '-');
  }
}

module.exports = { inc1DoubleBed, inc2DoubleBed, incMultDoubleBed, decDoubleBedTempFix, bindoff };