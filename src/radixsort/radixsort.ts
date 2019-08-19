import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function radixSort(textureWidth: number) {
	const maskFrag = require("fs").readFileSync("src/radixsort/00_mask.frag", "utf8");
	const scanFrag = require("fs").readFileSync("src/radixsort/01_scan.frag", "utf8");
	const scatterFrag = require("fs").readFileSync("src/radixsort/02_scatter.frag", "utf8");
	const transposeFrag = require("fs").readFileSync("src/radixsort/03_transpose.frag", "utf8");
	const transposeVert = require("fs").readFileSync("src/radixsort/03_transpose.vert", "utf8");

	const indices = new gpu.RenderTarget(textureWidth);
	const data = new gpu.RenderTarget(textureWidth);
	const alpha = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const maskShader = new gpu.ComputeShader(maskFrag, fragVariables);
	const scanShader = new gpu.ComputeShader(scanFrag, fragVariables);
	const scatterShader = new gpu.ComputeShader(scatterFrag, fragVariables);
	const transposeShader = new gpu.ComputeShader(
		transposeFrag,
		fragVariables,
		transposeVert.replace("${textureWidth}", `${textureWidth}.0`)
	);

	indices.pushTextureData(createIndices(textureWidth));

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		const xArr = gpu.packInt16(uniformInt32Range(i, gpu.MIN_INT16, gpu.MAX_INT16));
		const yArr = gpu.packInt16(uniformInt32Range(i + 123, gpu.MIN_INT16, gpu.MAX_INT16));
		bytes[i + 0] = xArr[0];
		bytes[i + 1] = xArr[1];
		bytes[i + 2] = yArr[0];
		bytes[i + 3] = yArr[1];
	}
	data.pushTextureData(bytes);

	let start = Date.now();
	for (var bitIndex = 31; bitIndex >= 0; bitIndex--) {
		alpha.compute(maskShader, { u_indices: indices, u_data: data, u_bitIndex: bitIndex });
		for (var i = 0; Math.pow(2, i) < textureWidth; i++) {
			alpha.compute(scanShader, {
				u_scanned: alpha,
				u_offsetX: Math.floor(Math.pow(2, i) % textureWidth),
				u_offsetY: Math.floor(Math.pow(2, i) / textureWidth)
			});
		}
		alpha.compute(scatterShader, { u_scanned: alpha });
		indices.compute(transposeShader, { u_scanned: alpha, u_indices: indices });
	}
	console.log(`finished RadixSort in: ${Date.now() - start}ms`);

	indices.delete();
	data.delete();
	alpha.delete();
	maskShader.delete();
	scanShader.delete();
	scatterShader.delete();
	transposeShader.delete();
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
