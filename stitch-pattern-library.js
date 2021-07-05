//---------------------------
//--- INITIAL VARIABLES ---//
//---------------------------
let frontOnlyPatterns = ['Bubbles'];

let generated = [];

let speed_number, stitch_number, roller_advance, row_count, pieceWidth, extraCarrier;

let options;

let extraCarrierPasses = 0;

let leftover = false;

//-----------------------------------------
//--- FUNCTION FOR EXTRA CARRIER PASS ---//
//-----------------------------------------
function extraCarrierPass() {
	function posPass() {
		for (let n = 1; n <= pieceWidth; ++n) {
			generated.push(`knit + b${n} ${extraCarrier.CARRIER}`);
		}
	}
	function negPass() {
		for (let n = pieceWidth; n >= 1; --n) {
			generated.push(`knit - b${n} ${extraCarrier.CARRIER}`);
		}
	}
	if (extraCarrier) {
		generated.push('x-roller-advance 0'); //?
		if (extraCarrier.DIR === '+') extraCarrierPasses % 2 === 0 ? negPass() : posPass();
		else extraCarrierPasses % 2 === 0 ? posPass() : negPass();
		++extraCarrierPasses;
	}
}

//-------------
//--- RIB ---//
//-------------
function generateRib(sequence, min, max, dir, carrier, avoid, pattern) {
	const POSRIB = () => {
		for (let n = min; n <= max; ++n) {
			if (sequence[n % sequence.length] === 'f') {
				generated.push(`knit + f${n} ${carrier}`);
				avoid.push(n);
			} else {
				generated.push(`knit + b${n} ${carrier}`);
			}
		}
	};

	const NEGRIB = () => {
		for (let n = max; n >= min; --n) {
			if (sequence[n % sequence.length] === 'f') {
				generated.push(`knit - f${n} ${carrier}`);
				avoid.push(n);
			} else {
				generated.push(`knit - b${n} ${carrier}`);
			}
		}
	};

	generated.push(';stitch pattern: Rib'); //?


	console.log('!', pattern.xfers, min, max); //remove //debug
	if (row_count === 0) { //TODO: this again if width of rib increases (transfer new stitches)
		// pattern.xfers[0] = min;
		// pattern.xfers[1] = max;
		generated.push('x-speed-number 100', 'x-roller-advance 0');
		for (let n = max; n >= min; --n) { ////doesn't rly matter direction for xfer
			if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
		// if (n % 2 === 0) generated.push(`xfer b${n} f${n}`);
		}
		for (let n = min; n <= max; ++n) {
			if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
		// if (n % 2 !== 0) generated.push(`xfer f${n} b${n}`);
		}
	} else {
		if (min < pattern.xfers[0]) {
			generated.push('x-speed-number 100', 'x-roller-advance 0');
			for (let n = pattern.xfers[0] - 1; n >= min; --n) {
				if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			}
			for (let n = min; n < pattern.xfers[0]; ++n) {
				if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
			}
			// pattern.xfers[0] = min;
		}
		if (max > pattern.xfers[1]) {
			generated.push('x-speed-number 100', 'x-roller-advance 0');
			for (let n = max; n > patterns.xfers[1]; --n) {
				if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			}
			for (let n = patterns.xfers[1] + 1; n <= max; ++n) {
				if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
			}
			// pattern.xfers[1] = max;
		}
	}

	// calculate rib stitch number based on actual stitch number
	generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`, `x-stitch-number ${Math.ceil(Number(stitch_number) / 2)}`);

	dir === '-' ? NEGRIB() : POSRIB();

	generated.push(`x-stitch-number ${stitch_number}`);

	// if (!double_bed) { //TODO: maybe add this back in
	// 	generated.push('x-speed-number 100');
	// 	for (let n = colors_arr[0].length; n >= 1; --n) {
	// 		generated.push(`xfer b${n} f${n}`);
	// 	}
	// 	generated.push(`x-speed-number ${speed_number}`, `;end rib`);
	// }

	return generated;
}

//--------------
//--- SEED ---//
//--------------
function generateSeed(min, max, dir, carrier, avoid) { //TODO: figure out how to avoid the back passes / make back passes only on correct needles / a pretty pattern
	function posSeed() {
		if (row_count % 2 === 0) {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
					generated.push(`knit + f${n} ${carrier}`);
					avoid.push(n);
				} else generated.push(`knit + b${n} ${carrier}`);
			}
		} else {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) generated.push(`knit + b${n} ${carrier}`);
				else {
					generated.push(`knit + f${n} ${carrier}`);
					avoid.push(n);
				}
			}
		}
	}

	function negSeed() {
		if (row_count % 2 === 0) {
			for (let n = max; n >= min; --n) {
				if (n % 2 === 0) {
					generated.push(`knit - f${n} ${carrier}`);
					avoid.push(n);
				} else generated.push(`knit - b${n} ${carrier}`);
			}
		} else {
			for (let n = max; n >= min; --n) {
				if (n % 2 === 0) generated.push(`knit - b${n} ${carrier}`);
				else {
					generated.push(`knit - f${n} ${carrier}`);
					avoid.push(n);
				}
			}
		}
	}

	generated.push(';stitch pattern: Seed');
	let emptyNeedles = ';empty:';

	// generated.push('x-roller-advance 0', 'x-speed-number 100');
	generated.push(`x-stitch-number ${Math.floor(stitch_number/2)}`, 'x-speed-number 200', 'x-roller-advance 80', 'x-xfer-style two-pass'); //?
	if (row_count % 2 === 0) {
		for (let n = min; n <= max; ++n) {
			if (n % 2 === 0) {
				generated.push(`xfer b${n} f${n}`);
				emptyNeedles += ` b${n}`; //new //check
			} else {
				generated.push(`xfer f${n} b${n}`);
				emptyNeedles += ` f${n}`; //new //check
			}
		}
	} else {
		for (let n = min; n <= max; ++n) {
			if (n % 2 === 0) {
				generated.push(`xfer f${n} b${n}`);
				emptyNeedles += ` f${n}`; //new //check
			} else {
				generated.push(`xfer b${n} f${n}`);
				emptyNeedles += ` b${n}`; //new //check
			}
		}
	}
	generated.push(emptyNeedles);

	generated.push('x-xfer-style four-pass', `x-stitch-number ${stitch_number}`, `x-speed-number ${speed_number}`, 'x-roller-advance 300'); //TODO: make this only if that row contains solely seed stitch
	// generated.push(`x-roller-advance ${roller_advance}`, `x-speed-number ${speed_number}`);
	dir === '-' ? negSeed() : posSeed();
	generated.push(`x-roller-advance ${roller_advance}`);
	// if (row_count === 0) {

	// }
	return generated;
}

//-----------------
//--- BUBBLES ---//
//-----------------
function generateBubbles(min, max, dir, carrier) { //TODO: test in bubbles need to be transferred to front to be completed successfully
	let bubbleStitch = stitch_number;
	let betweenStitch = Math.floor(bubbleStitch/2);
	let bubbleRoller = 200; //TODO: find ideal roller advance (maybe 300?)

	//TODO: make these customizable
	let bubbleWidth = (options ? options.bubbleWidth : 5);
	let bubbleHeight = (options ? options.bubbleHeight : 8);
	let overlap = (options ? options.overlap : 1);
	// let bubbleWidth = 5; 
	// let bubbleHeight = 8;
	// let overlap = 1;
	let altTuck = true;

	if (bubbleWidth === 5) bubbleRoller = 300; //remove //debug

	// let leftover = false;
	let spaceBetween = bubbleWidth - (2 * overlap);

	let bubbleCount = 0;

	function createBubble(leftN, rightN) {
		generated.push(`x-stitch-number ${bubbleStitch}`);
		if (bubbleCount % 2 === 0) extraCarrierPass();
		generated.push(`x-roller-advance ${bubbleRoller}`); //?
		if (dir === '+') {
			if (rightN > max) {
				if (max - leftN + 1 === overlap) leftover = false;
				else leftover = rightN - max;
				rightN = max;
			} else leftover = overlap;
			for (let r = 0; r < bubbleHeight/2; ++r) {
				for (let n = leftN; n <= rightN; ++n) {
					generated.push(`knit + f${n} ${carrier}`);
				}
				if (rightN !== pieceWidth && (!altTuck || r % 2 === 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck + f${rightN+1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
				for (let n = rightN; n >= leftN; --n) {
					generated.push(`knit - f${n} ${carrier}`);
				}
				if (leftN !== 1 && (!altTuck || r % 2 !== 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck - f${leftN-1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
			}
			//once more
			for (n = leftN; n <= rightN; ++n) {
				generated.push(`knit + f${n} ${carrier}`);
			}
		} else {
			if (leftN < min) {
				if (rightN - min - 1 === overlap) leftover === false;
				else leftover = min - leftN;
				leftN = min;
			} else leftover = overlap;
			for (let r = 0; r < bubbleHeight/2; ++r) {
				for (let n = rightN; n >= leftN; --n) {
					generated.push(`knit - f${n} ${carrier}`);
				}
				if (leftN !== 1 && (!altTuck || r % 2 === 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck - f${leftN-1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
				for (n = leftN; n <= rightN; ++n) {
					generated.push(`knit + f${n} ${carrier}`);
				}
				if (rightN !== pieceWidth && (!altTuck || r % 2 !== 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck + f${rightN+1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
			}
			//once more
			for (let n = rightN; n >= leftN; --n) {
				generated.push(`knit - f${n} ${carrier}`);
			}
		}
		++bubbleCount;
	}

	function posBubblePass() {
		let n = min;
		let shift = spaceBetween;
		if (leftover) {
			let w = leftover + 1;
			createBubble(n, n + leftover);
			shift = 0;
			n += w;
		}
		for (n; n <= max; ++n) {
			if (shift === spaceBetween) {
				createBubble(n, n + (bubbleWidth-1));
				shift = 0;
				n += (bubbleWidth-1);
			} else {
				generated.push(`x-stitch-number ${betweenStitch}`, `knit + f${n} ${carrier}`);
				++shift;
				if (n === max) {
					leftover = shift + overlap;
				}
			}
		}
	}

	function negBubblePass() {
		let n = max;
		let shift = spaceBetween;
		if (leftover) {
			let w = leftover;
			createBubble((n - leftover) + 1, n);
			shift = 0;
			n -= w;
		}
		for (n; n >= min; --n) {
			if (shift === spaceBetween) {
				createBubble(n - (bubbleWidth-1), n);
				n -= (bubbleWidth-1);
				shift = 0;
			} else {
				generated.push(`x-stitch-number ${betweenStitch}`, `knit - f${n} ${carrier}`);
				if (n === min) leftover = shift + overlap;
				++shift;
			}
		}
	}

	generated.push(';stitch pattern: Bubbles'); //?

	
	// extraCarrierPass(); //? //remove

	dir === '+' ? posBubblePass() : negBubblePass();

	if (extraCarrier && extraCarrierPasses % 2 !== 0) extraCarrierPass(); //make sure carrier ends up where it started

	generated.push(`x-roller-advance ${roller_advance}`);

	return generated;
}

//-------------------------------
//--- MAIN PATTERN FUNCTION ---//
//-------------------------------
function generatePattern(pattern, row, min, max, dir, speed, stitch, roller, width, backpassCarrier, avoid) {
// function generatePattern(pattern, min, max, dir, speed, stitch, roller, width, backpassCarrier, avoid) {
	generated = [];

	row_count = row;
	// row_count = pattern.completed;
	speed_number = speed;
	stitch_number = stitch;
	roller_advance = roller;
	pieceWidth = width;
	extraCarrier = backpassCarrier;
	options = pattern.options;
	// console.log(pattern.name); //remove //debug
	// console.log(options); //remove //debug
	// console.log(Object.keys(options).length); //remove //debug
	if (pattern.name.includes('Rib')) {
		let sequence;
		if (pattern.name === 'Rib 1x1') sequence = 'fb';
		else if (pattern.name === 'Rib 2x2') sequence = 'ffbb';
		// let pattern = "bbffbf";
		return generateRib(sequence, min, max, dir, pattern.carrier, avoid, pattern);
	} else if (pattern.name === 'Seed') return generateSeed(min, max, dir, pattern.carrier, avoid);
	else if (pattern.name === 'Bubbles') return generateBubbles(min, max, dir, pattern.carrier);
	// if (name === 'Rib') return generateRib(sequence, min, max, dir, carrier);
}

module.exports = { frontOnlyPatterns, generatePattern };