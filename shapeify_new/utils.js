// const wrapAnsi16 = (offset = 0) => code => `\u001B[${code + offset}m`;


(offset = 0) => code => `\u001B[${code + offset}m`;


let ansi_styles = {
  bold: [1, 22],
  italic: [3, 23],
  underline: [4, 24],
  black: [30, 39],
  white: [97, 39], //aka white
  gray: [90, 39], //aka blackBright
  red: [91, 39], //aka redBright
  orange: [33, 39], //aka yellow
  yellow: [93, 39], //aka yellowBright
  green: [32, 39],
  // blue: [36, 39], //aka cyan
  blue: [34, 39],
  purple: [94, 39], //aka blueBright
  // purple: [35, 39],
  magenta: [95, 39], //aka magentaBright
  // cyan: [96, 39]
}


let hex_styles = {
  black: '#282a36',
  white: '#f8f8f2',
  gray: '#44475a',
  red: '#ff5555',
  orange: '#ffb86c',
  yellow: '#f1fa8c',
  green: '#50fa7b',
  blue: '#8be9fd',
  purple: '#bd93f9',
  magenta: '#ff79c6',
  // cyan: '#8be9fd'
}


const wrapAnsi = (sty, message) => {
  let code;

  if (sty.slice(0, 2) === 'bg') {
    code = [...ansi_styles[sty.slice(2).toLowerCase()]];
    code[0] += 10;
    code[1] += 10;

  } else code = [...ansi_styles[sty]];
  
  return `\x1B[${code[0]}m${message}\x1B[${code[1]}m`;
}


const wrapSpan = (sty, message) => {
  let css;
  if (sty === 'bold') css = 'font-weight:bold';
  else if (sty === 'italic') css = 'font-style:italic';
  else if (sty === 'underline') css = 'text-decoration:underline';
  else css = `color:${hex_styles[sty]}`;
  
  return `<span style="${css}">${message}</span>`;
}


class Logger {
  constructor(env) {
    if (env === 'node') this.wrapper = wrapAnsi;
    else this.wrapper = wrapSpan;
  }


  style(message, specs) {
    for (let sty of specs) {
      message = this.wrapper(sty, message);
    }

    return message;
  }
}


const logger = new Logger('node');

const web_logger = new Logger('web');


function styler(message, specs) {
  return logger.style(message, specs);
}


function webStyler(message, specs) {
  return web_logger.style(message, specs);
}



// if (typeof window === 'undefined' && typeof window.document === 'undefined') { //node
if (typeof window === 'undefined') { //node
  exports.styler = styler;
} else { //browser
  exports.styler = webStyler;

	console.log = function(message) {
    let logger = document.getElementById('log');

		if (typeof message == 'object') {
			logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : message) + '<br />';
		} else {
			logger.innerHTML += message + '<br />';
		}
	}
}


function generateError(message) {
	let err;
	try {
		throw new Error(message);
	} catch (e) {
		err = e;
	}
	if (!err) return;

	let err_stack = err.stack.split('\n');
	err_stack.splice(1, 1); //removing the line that we force to generate the error

	let info = ' ' + err_stack[1].match(/(at)\s.*\s\(/)[0] + err_stack[1].match(/[^\/]+.$/)[0];

	err_stack[0] += info;

	console.log(err_stack.join('\n'));
	process.exit();
}


exports.console = console;

exports.generateError = generateError;
