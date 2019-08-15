import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function bitonicSort() {
	const textureWidth = 4;

	const bitonicSortSource = require("fs").readFileSync("src/bitonicsort/032_bitonicSort.frag", "utf8");

	let start = Date.now();

	const indices = new gpu.RenderTarget(textureWidth);
	const firstByteSlice = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const computeShader = new gpu.ComputeShader(bitonicSortSource, fragVariables);

	indices.pushTextureData(createIndices(textureWidth));

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		bytes[i + 0] = 255 - i;
	}
	firstByteSlice.pushTextureData(bytes);

	const bitonicUniforms = calculateBitonicUniforms(textureWidth);
	console.log(bitonicUniforms);
	for (var uniforms of bitonicUniforms) {
		indices.compute(computeShader, {
			u_indices: indices,
			u_firstByteSlice: firstByteSlice,
			u_wireLengthX: uniforms.wireLengthX,
			u_wireLengthY: uniforms.wireLengthY,
			u_regionSizeX: uniforms.regionSizeX,
			u_regionSizeY: uniforms.regionSizeY
		});
		break;
	}

	console.log(`finished BitonicSort in: ${Date.now() - start}ms`);
	console.log(unpackInt16Pairs(indices.readPixels()));
	// console.log(unpackInt16Pairs(firstByteSlice.readPixels()));
}

function createIndices(textureWidth: number) {
	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		var index = Math.floor(i / 4);
		var xArr = gpu.packInt16(Math.floor(index % textureWidth));
		var yArr = gpu.packInt16(Math.floor(index / textureWidth));
		bytes[i + 0] = xArr[0];
		bytes[i + 1] = xArr[1];
		bytes[i + 2] = yArr[0];
		bytes[i + 3] = yArr[1];
	}
	return bytes;
}

function unpackInt16Pairs(bytes: Uint8Array) {
	const arr = [];
	for (var i = 0; i < bytes.length; i += 4) {
		arr.push([gpu.unpackInt16(bytes[i + 0], bytes[i + 1]), gpu.unpackInt16(bytes[i + 2], bytes[i + 3])]);
	}
	return arr;
}

interface bitonicUniforms {
	wireLengthX: number;
	wireLengthY: number;
	regionSizeX: number;
	regionSizeY: number;
}

function calculateBitonicUniforms(width: number) {
	const arr = [] as bitonicUniforms[];
	for (var rs = 4; rs <= 2 * width * width; rs *= 2) {
		for (var wl = rs / 4; wl >= 1; wl /= 2) {
			console.log(`regionSize: ${rs} wireLength: ${wl}`);
			arr.push({
				wireLengthX: Math.floor(wl % width),
				wireLengthY: Math.floor(wl / width),
				regionSizeX: Math.floor(rs % width) > 0 ? Math.floor(rs % width) : width,
				regionSizeY: Math.max(Math.floor(rs / width), 1)
			});
		}
	}
	return arr;
}
