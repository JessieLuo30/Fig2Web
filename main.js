const request = require('request');
const { sendZipFiles } = require('./helperFunctions');
let fs = require('fs');

let index = 1;
const classNames = new Set();
let x = 0;
let y = 0;
const start = Date.now();

let img_data;
let baseFile;
let style;
let lastFile;
let lastFileName;

let childSet = new Set();
let allSet = new Set();

let preIndex = 1;
function getCompSet(dt, isFrameChild) {
	let is = isFrameChild;
	dt.forEach((child) => {
		let name = child.name.replace(/[^a-z]/gi, '');
		if (allSet.has(name)) {
			name += `${preIndex}`;
			preIndex++;
		}
		allSet.add(name);
		if (is && child.type == 'GROUP') {
			childSet.add(name);
		}
		if (child.type == 'FRAME') {
			isFrameChild = true;
		} else {
			isFrameChild = false;
		}
		if (child.children) {
			getCompSet(child.children, isFrameChild);
		}
	});
}

function transform(res, mode, figma_id) {
	const options = {
		method: 'GET',
		url: `https://api.figma.com/v1/files/${figma_id}`,
		headers: {
			'X-Figma-Token': 'figd_gTSy9yS2EBwptIg1FoKzoMac7oNLtv9eszgU44dC'
		}
	};

	const img = {
		method: 'GET',
		url: `https://api.figma.com/v1/files/${figma_id}/images`,
		headers: {
			'X-Figma-Token': 'figd_gTSy9yS2EBwptIg1FoKzoMac7oNLtv9eszgU44dC'
		}
	};
	request(img, function(error, response, body) {
		if (error) throw new Error(error);
		img_data = JSON.parse(body).meta.images;

		request(options, function(error, response, body) {
			if (error) throw new Error(error);

			const data = JSON.parse(body).document.children;
			let foldername;
			if (mode === 'raw') {
				foldername = figma_id + '_raw';
				fs.mkdirSync(foldername);
				baseFile = fs.createWriteStream(foldername + '/index.html');
				style = fs.createWriteStream(foldername + '/style.css');
				findChildren('html', data, '', baseFile, style, null, null, foldername);
				baseFile.write('<style>\n');
				baseFile.write('</style>\n');
			} else if (mode === 'react') {
				getCompSet(data, false);
				foldername = figma_id + '_react';
				fs.mkdirSync(foldername);
				fs.mkdirSync(foldername + '/components');
				style = fs.createWriteStream(foldername + '/index.css');
				baseFile = fs.createWriteStream(foldername + '/App.js');
				openReact(baseFile, 'App', childSet);
				findChildren('react', data, '', baseFile, style, null, null, foldername);
				if (lastFile != baseFile) {
					closeReact(lastFile, lastFileName);
				}
				closeReact(baseFile, 'App');
			}
			style.end();
			baseFile.end();
			baseFile.on('open', (fd) => {
				sendZipFiles(res, figma_id, mode, foldername);
			});
		});
	});
}

let pen = false;
let componentSet;

function openReact(file, compName, childComp) {
	let padding = '	';
	if (compName && compName[0]) {
		compName[0] = compName[0].toUpperCase();
	}
	file.write('import React from "react"; \n\n');

	if (childComp) {
		childComp.forEach((child) => {
			file.write(`import ${child} from "./components/${child}";\n`);
		});
	}
	file.write('\n');
	file.write(`function ${compName}() {\n`);
	file.write(padding + 'return (\n');
	file.write(padding + padding + '<>\n');
}

function closeReact(file, fileName) {
	let padding = '	';
	file.write(padding + padding + '</>\n');
	file.write('\n' + padding + ');\n');
	file.write('}\n\n');
	file.write(`export default ${fileName};\n`);
}

function findChildren(type, data, padding, file, style, absoluteBoundingBox, newFile, foldername) {
	if (data[1] && data[1].type && data[1].type == 'COMPONENT_SET') {
		componentSet = data[1].children;
	}
	data.forEach((child) => {
		if (child.type == 'COMPONENT_SET') {
			return;
		}
		var replaced = child.name.replace(/[^a-z]/gi, '');
		if (classNames.has(replaced)) {
			replaced += `${index}`;
			index++;
		}
		classNames.add(replaced);
		if (type == 'react' && newFile && child.type == 'GROUP') {
			if (file !== baseFile) {
				closeReact(file, lastFileName);
			}
			let componentFile = fs.createWriteStream(foldername + '/components/' + replaced + '.js');
			baseFile.write(padding + '<' + replaced + ' />\n');
			lastFile = componentFile;
			lastFileName = replaced;
			file = componentFile;
			openReact(file, replaced);
		}

		file.write(padding + '<div class = ' + `"${replaced}"` + '>\n');
		style.write('.' + replaced + '{\n');

		var stylePad = '    ';
		var paddingPlus = padding + '    ';
		let contains_img = false;

		if (child.type) {
			if (child.type == 'FRAME') {
				pen = true;
				x = child.absoluteRenderBounds.x;
				y = child.absoluteRenderBounds.y;
			} else {
				pen = false;
			}

			// width, height
			if (child.absoluteRenderBounds) {
				if (child.type == 'TEXT' || child.type == 'ELLIPSE') {
					style.write(stylePad + 'height:' + child.absoluteBoundingBox.height + 'px;\n');
					style.write(stylePad + 'width: ' + child.absoluteBoundingBox.width + 'px;\n');
					if (child.type == 'ELLIPSE') {
						if (child.absoluteBoundingBox.height > child.absoluteBoundingBox.width) {
							style.write(stylePad + 'border-radius: ' + child.absoluteBoundingBox.width / 2 + 'px;\n');
						} else {
							style.write(stylePad + 'border-radius: ' + child.absoluteBoundingBox.height / 2 + 'px;\n');
						}
					}
				} else {
					style.write(stylePad + 'height:' + child.absoluteRenderBounds.height + 'px;\n');
					style.write(stylePad + 'width: ' + child.absoluteRenderBounds.width + 'px;\n');
				}

				style.write(stylePad + 'position: absolute;\n');
				if (absoluteBoundingBox) {
					var top = parseInt(child.absoluteRenderBounds.y - absoluteBoundingBox.y, 10).toString();
					var left = parseInt(child.absoluteRenderBounds.x - absoluteBoundingBox.x, 10).toString();
				} else {
					var top = parseInt(child.absoluteRenderBounds.y - y, 10).toString();
					var left = parseInt(child.absoluteRenderBounds.x - x, 10).toString();
				}
				style.write(stylePad + 'top:' + top + 'px;\n');
				style.write(stylePad + 'left:' + left + 'px;\n');

				if (child.fills && child.fills[0] && child.fills[0].type == 'IMAGE') {
					contains_img = true;

					var imageRef = child.fills[0].imageRef.toString();
					const src = img_data[imageRef];
					let img_name = replaced + '_img';
					classNames.add(img_name);
					file.write(paddingPlus + '<img class = ' + `"${img_name}"` + ` src = "${src}"` + '/>\n');
					style.write(stylePad + 'overflow: hidden;\n');
					style.write('}\n');
					style.write(`.${img_name}{\n`);

					style.write(stylePad + 'height:' + child.absoluteBoundingBox.height + 'px;\n');
					style.write(stylePad + 'width: ' + child.absoluteBoundingBox.width + 'px;\n');

					let img_top = parseInt(child.absoluteBoundingBox.y - child.absoluteRenderBounds.y, 10).toString();
					let img_left = parseInt(child.absoluteBoundingBox.x - child.absoluteRenderBounds.x, 10).toString();
					style.write(stylePad + 'top:' + img_top + 'px;\n');
					style.write(stylePad + 'left:' + img_left + 'px;\n');
					style.write('}\n');
				}
			}

			if (child.type == 'LINE' && child.strokes[0]) {
				let r = parseInt(child.strokes[0].color.r * 255, 10).toString();
				let g = parseInt(child.strokes[0].color.g * 255, 10).toString();
				let b = parseInt(child.strokes[0].color.b * 255, 10).toString();
				let a = child.strokes[0].color.a.toString();
				style.write(stylePad + 'background-color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ');\n');
			}

			if (child.type == 'TEXT') {
				// color
				file.write(paddingPlus + child.characters + '\n');
				let r = parseInt(child.fills[0].color.r * 255, 10).toString();
				let g = parseInt(child.fills[0].color.g * 255, 10).toString();
				let b = parseInt(child.fills[0].color.b * 255, 10).toString();
				let a = child.fills[0].color.a.toString();
				style.write(stylePad + 'color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ');\n');

				// max-width
				let width = child.absoluteBoundingBox.width.toString();
				style.write(stylePad + 'max-width: ' + width + 'px;\n');

				// font-size: 20px;
				let fontSize = child.style.fontSize.toString();
				style.write(stylePad + 'font-size: ' + fontSize + 'px;\n');

				// letter-spacing: 0%;
				let letterSpacing = child.style.letterSpacing.toString();
				style.write(stylePad + 'letter-spacing: ' + letterSpacing + '%;\n');

				// text-align: left;
				let textAlign = child.style.textAlignHorizontal.toString().toLowerCase();
				style.write(stylePad + 'text-align: ' + textAlign + ';\n');

				// font-family: "Inter", sans-serif;
				var fontFamily = child.style.fontFamily.toString();
				style.write(stylePad + 'font-family: ' + fontFamily + ';\n');

				// font-weight: 600;
				let fontWeight = child.style.fontWeight.toString();
				style.write(stylePad + 'font-weight: ' + fontWeight + ';\n');

				// line height
				var fontHeight = child.style.lineHeightPx.toString();
				style.write(stylePad + 'line-height: ' + fontHeight + 'px;\n');

				// stroke
				if (child.strokes[0]) {
					var sr = parseInt(child.strokes[0].color.r * 255, 10).toString();
					var sg = parseInt(child.strokes[0].color.g * 255, 10).toString();
					var sb = parseInt(child.strokes[0].color.b * 255, 10).toString();
					var sa = child.strokes[0].color.a.toString();
					style.write(
						stylePad +
							'-webkit-text-stroke: ' +
							child.strokeWeight.toString() +
							'px rgba(' +
							sr +
							', ' +
							sg +
							', ' +
							sb +
							', ' +
							sa +
							');\n'
					);
				}

				// font
			} else if (child.type == 'RECTANGLE') {
				if (child.fills && child.fills[0] && child.fills[0].color && !child.isMask) {
					let r = parseInt(child.fills[0].color.r * 255, 10).toString();
					let g = parseInt(child.fills[0].color.g * 255, 10).toString();
					let b = parseInt(child.fills[0].color.b * 255, 10).toString();
					let a = child.fills[0].color.a.toString();
					style.write(stylePad + 'background-color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ');\n');
					style.write(stylePad + 'z-index: 0;\n');
					if (child.opacity) {
						style.write(stylePad + 'opacity:' + child.opacity + ';\n');
					}
				}
				//border:1px solid rgba(255, 228, 207, 1);
				if (child.strokes && child.strokes[0]) {
					var r = parseInt(child.strokes[0].color.r * 255, 10).toString();
					var g = parseInt(child.strokes[0].color.g * 255, 10).toString();
					var b = parseInt(child.strokes[0].color.b * 255, 10).toString();
					var a = child.strokes[0].color.a.toString();
					let weight = child.strokeWeight.toString();
					style.write(
						stylePad + 'border:' + weight + 'px solid rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ');\n'
					);
					if (child.cornerRadius) {
						style.write(stylePad + 'border-radius: ' + child.cornerRadius + 'px;\n');
					}
				}
			}

			if (child.backgroundColor && child.type != 'VECTOR') {
				var r = parseInt(child.backgroundColor.r * 255, 10).toString();
				var g = parseInt(child.backgroundColor.g * 255, 10).toString();
				var b = parseInt(child.backgroundColor.b * 255, 10).toString();
				var a = child.backgroundColor.a.toString();
				style.write(stylePad + 'background-color: rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ');\n');
			}
		}

		if (!contains_img) {
			style.write('}\n');
		}

		if (child.children) {
			findChildren(type, child.children, paddingPlus, file, style, child.absoluteBoundingBox, pen, foldername);
		}
		file.write(padding + '</div>\n');
	});
}

module.exports = { transform };
