// const { KnitoutOp } = require('./shape.js');

// miss_op = new KnitoutOp({op: 'miss', d: '+', bn: ['f', rightN], cs: cs});

let temp_fix = true; //TODO: deal with this on the machine

const bed_args = ['f', 'fs', 'b', 'bs'];
const d_ops = ['knit', 'tuck', 'miss', 'split'];
const bn0_ops = ['split', 'xfer'];
const bn_ops = ['knit', 'tuck', 'miss', 'split', 'xfer', 'drop'];
const cs_ops = ['knit', 'tuck', 'miss', 'split', 'in', 'out', 'inhook', 'releasehook', 'outhook'];

class KnitoutOp {
  constructor({op, d, bn0=[], bn=[], cs=[], param, comment, insert_idx}) {
    this.op = op;
    this.d = d; //undefined;

    if (!Array.isArray(bn0)) bn0 = [bn0.match(/[a-zA-Z]+/)[0], Number(bn0.match(/\d+/)[0])]; //console.log('TODO');
    this.bn0 = bn0; //[];

    if (!Array.isArray(bn)) bn = [bn.match(/[a-zA-Z]+/)[0], Number(bn.match(/\d+/)[0])]; //console.log('TODO');
    this.bn = bn; //[];

    if (!Array.isArray(cs)) this.cs = [cs];
    else this.cs = cs; //[];

    this.param = param; //undefined; //for when something like header, extension, or rack that thats a different param
    this.comment = comment; //undefined;

    this.insert_idx = insert_idx;
    // this.bn = 
  }

  addArgs(key_vals) {
    for (let [key, val] of Object.entries(key_vals)) {
      if (Array.isArray(this[key]) && !Array.isArray(val)) this[key].push(val);
      else this[key] = val;
    }
  }

  replaceArgs(key_vals) {
    for (let [key, val] of Object.entries(key_vals)) {
      if (this[key] === undefined || (Array.isArray(this[key]) && !this[key].length)) continue; // don't 'replace' if the op doesn't already exist
      if (Array.isArray(this[key]) && !Array.isArray(val)) this[key] = [val];
      else this[key] = val;
    }
  }

  generateCode(arr) {
    let out = '';
    if (this.op) {
      out += this.op;
      //DEBUG: //TODO: //remove //v
      if (d_ops.includes(this.op)) console.assert(this.d === '+' || this.d === '-', `required arg "d" missing or incorrect for "${this.op}" op (got ${this.d}).`);
      else console.assert(this.d === undefined, `op "${this.op}" doesn't take arg "d" (got ${this.d}).`);

      if (bn0_ops.includes(this.op)) console.assert(this.bn0.length === 2 && bed_args.includes(this.bn0[0]) && typeof this.bn0[1] === 'number', `required arg "bn0" missing or incorrect for "${this.op}" op (got ${this.bn0}).`);
      else console.assert(!this.bn0.length, `op "${this.op}" doesn't take arg "bn0" (got ${this.bn0}).`);

      if (bn_ops.includes(this.op)) console.assert(this.bn.length === 2 && bed_args.includes(this.bn[0]) && typeof this.bn[1] === 'number', `required arg "bn" missing or incorrect for "${this.op}" op (got ${JSON.stringify(this.bn)}).`);
      else console.assert(!this.bn.length, `op "${this.op}" doesn't take arg "bn0" (got ${this.bn}).`);

      if (cs_ops.includes(this.op)) console.assert(this.cs.length && !this.cs.some(c => isNaN(c)), `required arg "cs" missing or incorrect for "${this.op}" op (got ${this.cs}).`);
      else console.assert(!this.cs.length, `op "${this.op}" doesn't take arg "cs" (got ${this.cs}).`);

      // console.assert(!d_ops.includes(this.op) || this.d, `required arg "d" missing for "${this.op}" op.`);
      // console.assert(!bn0_ops.includes(this.op) || this.bn0.length, `required arg "bn0" missing for "${this.op}" op.`);
      // console.assert(!bn_ops.includes(this.op) || this.bn.length, `required "bn" arg missing for "${this.op}" op.`);
      // console.assert(!cs_ops.includes(this.op) || this.cs.length, `required "cs" arg missing for "${this.op}" op.`);

      if (this.op === 'rack' || (this.op.length > 1 && (this.op.slice(0, 2) === 'x-' || this.op.slice(0, 2) === ';;'))) console.assert(this.param !== undefined, `required "param" arg missing for "${this.op}" op.`);

      // console.assert(this.parathis.op !== 'rack' || this.op.length < 2, );

      // if (d_ops.includes(this.op) && !d) 
      // if (this.op === 'knit' || this.op === 'miss' || this.op === 'tuck' || this.op === 'split') {
      //   console.assert(this.d !== undefined && this.bn.length === 2 && this.cs.length && (this.op !== 'split' || this.bn0.length), `missing args for "${this.op}" op (d: ${this.d}${this.op === 'split' ? ', bn0: ' + JSON.stringify(this.bn0) : ''}, bn: ${this.bn}, cs: ${this.cs})`);
      // }
    }
    if (this.param !== undefined) {
      if (Array.isArray(this.param)) out += ` ${this.param.join(' ')}`;
      else out += ` ${this.param}`;
    } else {
      if (this.d) out += ` ${this.d}`;
      if (this.bn0.length) out += ` ${this.bn0.join('')}`;
      if (this.bn.length) out += ` ${this.bn.join('')}`;
      if (this.cs.length) out += ` ${this.cs.join(' ')}`;
    }
    if (this.comment !== undefined) {
      if (out.length) out += ' ';
      out += `;${this.comment}`;
    }

    if (arr) {
      if (this.insert_idx) arr.splice(this.insert_idx, 0, out);
      else arr.push(out);
    } else return out;
  }
}


function tuckPattern(machine, firstN, direction, bed, c, arr) {
  let to_drop = [];
	arr.push(';start tuck pattern');
	if (direction === '+') {
		for (let n = firstN-1; n > firstN-6; --n) {
			if (n % 2 == 0) {
        arr.push(`tuck - ${bed}${n} ${c}`);
        to_drop.push([bed, n]);
      } else if (n == firstN - 5) arr.push(`miss - ${bed}${n} ${c}`);
		}
		
    for (let n = firstN-5; n < firstN; ++n) {
      if (n % 2 != 0) {
        arr.push(`tuck + ${bed}${n} ${c}`);
        to_drop.push([bed, n]);
      } else if (n == firstN-1) arr.push(`miss + ${bed}${n} ${c}`);
    }
	} else {
		if (machine.includes('swg')) { //do it twice so always starting in negative direction
			for (let n = firstN+5; n > firstN; --n) {
				if (n % 2 == 0) arr.push(`tuck - ${bed}${n} ${c}`);
        else if (n == firstN+1) arr.push(`miss - ${bed}${n} ${c}`);
			}
		}

		for (let n = firstN+1; n < firstN+6; ++n) {
			if (n % 2 != 0) {
        arr.push(`tuck + ${bed}${n} ${c}`);
        to_drop.push([bed, n]);
      } else if (n == firstN+5) arr.push(`miss + ${bed}${n} ${c}`);
		}

    for (let n = firstN+5; n > firstN; --n) {
      if (n % 2 == 0) {
        arr.push(`tuck - ${bed}${n} ${c}`);
        to_drop.push([bed, n]);
      } else if (n == firstN+1) arr.push(`miss - ${bed}${n} ${c}`);
    }
	}

	arr.push(';end tuck pattern');
  return to_drop;
}

//------------------------------
//--- INCREASING FUNCTIONS ---//
//------------------------------
const inc1DoubleBed = (specs, side, prevN, carrier, arr) => { //TODO: make it so won't increase on needles that are meant to be empty
  let twisted_stitches = [];
  if (!specs) specs = {'machine': 'swgn2', 'inc_method': 'split'};

  if (side === 'left') {
    if (specs.inc_method === 'xfer') {
      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN-1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -100}));
      // arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN], cs: carrier})); // ensures/forces order of xfers that is least likely to drop stitches //go back! //?

      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN-1]}));

      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN-1]}));

      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      // arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier})); //miss carrier out of the way //go back! //?
    } else if (specs.inc_method === 'split') {
      // TODO: remember what low speed is for swgn2
      if (specs.split_speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.split_speedNumber}));

      if (specs.machine === 'kniterate' && temp_fix) {
        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN], bn: ['f', prevN-1], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN-1], bn: ['b', prevN-1], cs: carrier}));
      } else {
        arr.push(new KnitoutOp({op: 'rack', param: 1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN], bn: ['b', prevN-1], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-1], bn: ['f', prevN-1], cs: carrier}));
      } //^

      // arr.push(new KnitoutOp({op: 'rack', param: 1})); //go back! //v
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN], bn: ['b', prevN-1], cs: carrier}));
      // arr.push(new KnitoutOp({op: 'rack', param: 0}));
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-1], bn: ['f', prevN-1], cs: carrier})); //^
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier})); //miss carrier out of the way

      if (specs.speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.speedNumber})); //reset it
    } else { //twisted-stitch
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['f', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['b', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier}));

      twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`); //['f', prevN-1], ['b', prevN-1]);
    }
  } else if (side === 'right') {
    if (specs.inc_method === 'xfer') {
      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN+1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -100}));
      // arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN], cs: carrier})); // ensures/forces order of xfers that is least likely to drop stitches //go back! //?
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN+1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN+1]}));

      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      // arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+1], cs: carrier})); //miss carrier out of the way //go back! //?
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.split_speedNumber}));

      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['f', prevN], bn: ['b', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['b', prevN+1], bn: ['f', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+1], cs: carrier})); //miss carrier out of the way

      if (specs.speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.speedNumber})); //reset it
    } else { // twisted stitch //TODO: return this in twisted stitches instead //?
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['f', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['b', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+1], cs: carrier}));

      twisted_stitches.push(`f${prevN+1}`, `b${prevN+1}`); //['f', prevN+1], ['b', prevN+1]);
    }
  }

  if (specs.inc_method === 'xfer') twisted_stitches.push(`f${prevN}`, `b${prevN}`); //['f', prevN], ['b', prevN]);

  return twisted_stitches;
}


const inc2DoubleBed = (specs, side, prevN, carrier, arr) => { //TODO: fix this for split
  let twisted_stitches = [];
  if (!specs) specs = {'machine': 'swgn2', 'inc_method': 'split'};

  if (side === 'left') {
    if (specs.inc_method === 'xfer') {
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-2], cs: carrier})); //miss carrier out of the way

      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN-1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN-2]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN-2], bn: ['f', prevN-2]}));
      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN-1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN+1], bn: ['f', prevN+1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN-2]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN]}));
      // twist = 1;
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.split_speedNumber}));

      if (specs.machine === 'kniterate' && temp_fix) { //TODO: //remove //temp //v
        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN], bn: ['f', prevN-1], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN-1], bn: ['b', prevN-1], cs: carrier}));

        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-1], bn: ['f', prevN-2], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN-2], bn: ['b', prevN-2], cs: carrier}));
      } else {
        arr.push(new KnitoutOp({op: 'rack', param: 1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN], bn: ['b', prevN-1], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-1], bn: ['f', prevN-1], cs: carrier}));

        arr.push(new KnitoutOp({op: 'rack', param: 1}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN-1], bn: ['b', prevN-2], cs: carrier}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-2], bn: ['f', prevN-2], cs: carrier}));
      } //^

      // arr.push(new KnitoutOp({op: 'rack', param: 1})); //go back! //v
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN], bn: ['b', prevN-1], cs: carrier}));
      // arr.push(new KnitoutOp({op: 'rack', param: 0}));
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-1], bn: ['f', prevN-1], cs: carrier}));

      // arr.push(new KnitoutOp({op: 'rack', param: 1}));
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['f', prevN-1], bn: ['b', prevN-2], cs: carrier}));
      // arr.push(new KnitoutOp({op: 'rack', param: 0}));
      // arr.push(new KnitoutOp({op: 'split', d: '+', bn0: ['b', prevN-2], bn: ['f', prevN-2], cs: carrier})); //^

      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-2], cs: carrier})); //miss carrier out of the way

      if (specs.speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.speedNumber}));
    } else { // twisted stitch
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['f', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['b', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', prevN-1], cs: carrier}));

      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['f', prevN-2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['b', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', prevN-1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier}));

      arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', prevN-1], cs: carrier}));

      // twisted_stitches.push(['f', prevN-1], ['b', prevN-1], ['f', prevN-2], ['b', prevN-2]);
    }
  } else if (side === 'right') {
    if (specs.inc_method === 'xfer') {
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+2], cs: carrier})); //miss carrier out of the way

      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN+1]}));
      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN+2]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN+2], bn: ['f', prevN+2]}));
      arr.push(new KnitoutOp({op: 'rack', param: 1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN+1]}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN-1], bn: ['f', prevN-1]}));
      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN+2]}));

      arr.push(new KnitoutOp({op: 'rack', param: 0}));
    } else if (specs.inc_method === 'split') {
      if (specs.split_speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.split_speedNumber}));
      
      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['f', prevN], bn: ['b', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['b', prevN+1], bn: ['f', prevN+1], cs: carrier}));

      arr.push(new KnitoutOp({op: 'rack', param: -1}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['f', prevN+1], bn: ['b', prevN+2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'rack', param: 0}));
      arr.push(new KnitoutOp({op: 'split', d: '-', bn0: ['b', prevN+2], bn: ['f', prevN+2], cs: carrier}));

      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+2], cs: carrier})); // miss carrier out of the way

      if (specs.speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.speedNumber})); // reset it
    } else { // twisted stitch
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['f', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['b', prevN+1], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', prevN+1], cs: carrier}));

      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['f', prevN+2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['b', prevN+2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', prevN+2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', prevN+2], cs: carrier}));

      // twisted_stitches.push(['f', prevN+1], ['b', prevN+1], ['f', prevN+2], ['b', prevN+2]);
    }
  }


  if (specs.inc_method === 'xfer') twisted_stitches.push(`f${prevN-1}`, `b${prevN-1}`, `f${prevN+1}`, `b${prevN+1}`); //['f', prevN-1], ['b', prevN-1], ['f', prevN+1], ['b', prevN+1]);

  return twisted_stitches;
}


const incMultDoubleBed = (side, count, prevN, carrier, arr) => {
  arr.push(new KnitoutOp({op: 'rack', param: 0.25})); // half rack for kniterate
  if (side === 'left') {
    for (let n = prevN; n >= prevN-count+1; --n) {
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', n], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['f', n], cs: carrier}));
    }
  } else if (side === 'right') {
    for (let n = prevN; n <= prevN+count-1; ++n) {
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['f', n], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', n], cs: carrier}));
    }
  }
  arr.push(new KnitoutOp({op: 'rack', param: 0}));
}


//------------------------------
//--- DECREASING FUNCTIONS ---//
//------------------------------
const decDoubleBedTempFix = (specs, side, count, prevN, arr) => { //temp
  if (!specs) specs = {'machine': 'swgn2'};

  if (count <= 2) {
    if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 150}));

    if (side === 'left') {
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN+1], bn: ['f', prevN+1]}));
      if (count === 2) arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN+2], bn: ['f', prevN+2]}));

      arr.push(new KnitoutOp({op: 'rack', param: -1}));

      if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 100}));

      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN], bn: ['b', prevN+1]}));
      if (count === 2) {
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN+2]}));

        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN+1], bn: ['f', prevN+1]}));
        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN+1], bn: ['b', prevN+2]}));
      }
    }
    if (side === 'right') { //side === 'right'
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN], bn: ['b', prevN]}));
      arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN-1]}));
      if (count === 2) arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-2], bn: ['b', prevN-2]}));

      arr.push(new KnitoutOp({op: 'rack', param: -1}));

      if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 100}));

      arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN], bn: ['f', prevN-1]}));
      if (count === 2) {
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN-1], bn: ['f', prevN-2]}));

        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', prevN-1], bn: ['b', prevN-1]}));
        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', prevN-1], bn: ['f', prevN-2]}));
      }
    }
    arr.push(new KnitoutOp({op: 'rack', param: 0}));
  } else throw Error(`ERROR: should not use this function for dec > 2 (invalid count of ${count})`);
}


function bindoff(specs, side, count, prevN, carrier, arr, as_dec_method, off_limits) {
  if (!specs) specs = {'machine': 'swgn2'};
  if (!off_limits) off_limits = [];

  if (specs.stitchNumber) {
    arr.push(new KnitoutOp({op: 'x-stitch-number', param: specs.stitchNumber})); //TODO: reset stitch number after //?
    if (specs.machine === 'kniterate') arr.push(new KnitoutOp({op: 'x-xfer-stitch-number', param: Math.ceil(specs.stitchNumber/2)}));
  }
  if (specs.speedNumber) arr.push(new KnitoutOp({op: 'x-speed-number', param: specs.speedNumber}));

  if (specs.machine === 'kniterate' && as_dec_method) arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 100}));

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
      if (op === 'knit') arr.push(new KnitoutOp({op: 'knit', d: '+', bn: [bed, n], cs: carrier}));
      else if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        arr.push(new KnitoutOp({op: 'xfer', bn0: [bed, n], bn: [receive, n]}));
      } else if (op === 'bind') {
        if (!as_dec_method && n === rightN) break pos; //TODO: //check
        
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', n], bn: ['f', n]}));
        arr.push(new KnitoutOp({op: 'rack', param: -1}));
        
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', n], bn: ['b', n+1]}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));
        if (n !== rightN) {
          if (specs.machine === 'kniterate' && n > leftN+3) { //new
            if ((n-leftN) < 60) arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -50}));
            else if ((n-leftN) === 60) arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 0}));
          }
          arr.push(new KnitoutOp({op: 'drop', bn: ['b', n-1]}));
        }
        if (specs.machine === 'kniterate' && (n-leftN) >= 60) arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 50})); //new
        arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', n+1], cs: carrier}));
        if (n < leftN+count-2) arr.push(new KnitoutOp({op: 'tuck', d: '-', bn: ['b', n], cs: carrier}));
        if (n === leftN+3 && !off_limits.includes(leftN-1)) arr.push(new KnitoutOp({op: 'drop', bn: ['b', leftN-1]})); //don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security)
      }
    }
  }

  const negLoop = (op, bed) => {
    neg: for (let n=rightN; n >= leftN; --n) {
      if (op === 'knit') arr.push(new KnitoutOp({op: 'knit', d: '-', bn: [bed, n], cs: carrier}));
      else if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        arr.push(new KnitoutOp({op: 'xfer', bn0: [bed, n], bn: [receive, n]}));
      } else if (op === 'bind') {
        if (!as_dec_method && n === leftN) break neg; //TODO: //check
        
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['b', n], bn: ['f', n]}));
        arr.push(new KnitoutOp({op: 'rack', param: 1}));
        arr.push(new KnitoutOp({op: 'xfer', bn0: ['f', n], bn: ['b', n-1]}));
        arr.push(new KnitoutOp({op: 'rack', param: 0}));

        if (n !== rightN) {
          if (specs.machine === 'kniterate' && n < leftN+count-4) { //new
            if (leftN+count-n < 60) arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -50}));
            else if (leftN+count-n === 60) arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 0}));
          }
          arr.push(new KnitoutOp({op: 'drop', bn: ['b', n+1]}));
        }

        if (specs.machine === 'kniterate' && leftN+count-n >= 60) arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 50}));

        arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', n-1], cs: carrier}));
        if (n > leftN+1) arr.push(new KnitoutOp({op: 'tuck', d: '+', bn: ['b', n], cs: carrier}));
        if (n === leftN+count-4 && !off_limits.includes(rightN+1)) arr.push(new KnitoutOp({op: 'drop', bn: ['b', rightN+1]})); //don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security)
      }
    }
  }

  const bindoffTail = (last_needle, dir) => {
    arr.push(new KnitoutOp({comment: 'tail'}));
    let otherT_dir, miss1, miss2;
    dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle+1), (miss2 = last_needle-1)) : ((otherT_dir = '+'), (miss1 = last_needle-1), (miss2 = last_needle+1));
    if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 200}));
    arr.push(new KnitoutOp({op: 'miss', d: dir, bn: ['b', miss1], cs: carrier}));
    if (specs.machine === 'kniterate') arr.push(new KnitoutOp({op: 'pause', param: 'tail?'}));
    for (let i = 0; i < 6; ++i) {
      arr.push(new KnitoutOp({op: 'knit', d: otherT_dir, bn: ['b', last_needle], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: otherT_dir, bn: ['b', miss2], cs: carrier}));
      arr.push(new KnitoutOp({op: 'knit', d: dir, bn: ['b', last_needle], cs: carrier}));
      arr.push(new KnitoutOp({op: 'miss', d: dir, bn: ['b', miss1], cs: carrier}));
    }
    if (specs.machine === 'kniterate') arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: 200}));
    // arr.push(new KnitoutOp({op: 'drop', bn: ['b', last_needle]}));
  }
  
  if (side === 'left') {
    if (!as_dec_method) {
      posLoop('knit', 'f');
      negLoop('knit', 'b');
    }
    negLoop('xfer', 'f');

    if (specs.machine === 'kniterate') { //TODO: make sure this is reset if necessary
      arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 50}));
      arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -50}));
    }
    if (!off_limits.includes(leftN-1)) arr.push(new KnitoutOp({op: 'tuck', d: '-', bn: ['b', leftN-1], cs: carrier})); //TODO: don't have it do this if shortrowing (or maybe just don't drop it //?)
    arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', leftN], cs: carrier}));
    arr.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', leftN+1], cs: carrier})); //hm....

    posLoop('bind', null);

    if (rightN < leftN+3 && !off_limits.includes(leftN-1)) arr.push(new KnitoutOp({op: 'drop', bn: ['b', leftN-1]})); // wasn't dropped earlier

    if (!as_dec_method) bindoffTail(rightN, '+');
    else arr.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', rightN], cs: carrier}));
  } else if (side === 'right') {
    if (!as_dec_method) {
      negLoop('knit', 'f');
      posLoop('knit', 'b');
    }

    posLoop('xfer', 'f');
  
    if (specs.machine === 'kniterate') { //new
      arr.push(new KnitoutOp({'op': 'x-roller-advance', param: 50}));
      arr.push(new KnitoutOp({'op': 'x-add-roller-advance', param: -50}));
    }
    if (!off_limits.includes(rightN+1)) arr.push(new KnitoutOp({op: 'tuck', d: '+', bn: ['b', rightN+1], cs: carrier}));
    arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', rightN], cs: carrier}));
    arr.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', rightN-1], cs: carrier}));

    negLoop('bind', null);
    // n === leftN+count-4
    if (count < 4 && !off_limits.includes(rightN+1)) arr.push(new KnitoutOp({op: 'drop', bn: ['b', rightN+1]})); // wasn't dropped earlier

    if (!as_dec_method) bindoffTail(leftN, '-');
    else arr.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', leftN], cs: carrier})); //TODO: decide if should knit thru most rightN in this situation (and same for leftN for left side bind) 
  }
}

module.exports = { KnitoutOp, tuckPattern, inc1DoubleBed, inc2DoubleBed, incMultDoubleBed, decDoubleBedTempFix, bindoff };
