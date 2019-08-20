precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_indices;
uniform sampler2D u_data;

uniform float u_iter;

const float TEXTURE_WIDTH = ${textureWidth};

float round(float f) { return floor(f + 0.5); }
float floatEquals(float f1, float f2) { return 1.0 - abs(sign(f1 - f2)); }
float floatNotEquals(float f1, float f2) { return abs(sign(f1 - f2)); }
float floatLessThan(float f1, float f2) { return max(sign(f2 - f1), 0.0); }
float floatGreaterThan(float f1, float f2) { return max(sign(f1 - f2), 0.0); }
float floatLessThanOrEqual(float f1, float f2) { return 1.0 - floatGreaterThan(f1, f2); }
float floatGreaterThanOrEqual(float f1, float f2) { return 1.0 - floatLessThan(f1, f2); }
float vec2ToInt16(vec2 v) { return clamp(floor(floor(v.r * 255.0) * 256.0) + floor(v.g * 255.0) - 32767.0, -32767.0, 32768.0); }
vec2 int16ToVec2(float f) { f = clamp(f, -32767.0, 32768.0) + 32767.0; return vec2(floor(f / 256.0), f - floor(f / 256.0) * 256.0) / 255.0; }
vec2 addToVec2(vec2 v, float f, float w) { v.y += floor((v.x + f) / w); v.x = mod(v.x + f, w); return v; }

void main() {
	// determine if we are comparing with the texel in front of us or behind us
	float offset = 0.0;
	float evenComesFirst = floatEquals(mod(floor(u_iter), 2.0), 0.0);
	float outputtingToEven = floatEquals(mod(floor(gl_FragCoord.x), 2.0), 0.0);
	offset += floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 1.0);
	offset -= floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 0.0);
	offset -= floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 1.0);
	offset += floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 0.0);

	// handle (literal) edge case
	offset *= floatGreaterThanOrEqual(floor(gl_FragCoord.x) + offset, 0.0);

	// calculate coordinates 
	vec2 peerFragCoord = addToVec2(vec2(gl_FragCoord.xy), offset, TEXTURE_WIDTH);

	// get indices
	vec4 currentIndexTexel = texture2D(u_indices, gl_FragCoord.xy / TEXTURE_WIDTH);
	vec2 currentIndex      = vec2(vec2ToInt16(currentIndexTexel.rg) + 0.5, 
								  vec2ToInt16(currentIndexTexel.ba) + 0.5);
	vec4 peerIndexTexel    = texture2D(u_indices, peerFragCoord.xy / TEXTURE_WIDTH);
	vec2 peerIndex         = vec2(vec2ToInt16(peerIndexTexel.rg) + 0.5, 
							  	  vec2ToInt16(peerIndexTexel.ba) + 0.5);

	// start creating alpha and bravo coordinates where alpha is expected to be less than bravo
	vec2 alphaIndex = floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 1.0) * vec2(currentIndex.xy)
					+ floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 0.0) * vec2(peerIndex.xy)
					+ floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 1.0) * vec2(peerIndex.xy)
					+ floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 0.0) * vec2(currentIndex.xy);
	vec2 bravoIndex = floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 1.0) * vec2(peerIndex.xy)
					+ floatEquals(evenComesFirst, 1.0) * floatEquals(outputtingToEven, 0.0) * vec2(currentIndex.xy)
					+ floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 1.0) * vec2(currentIndex.xy)
					+ floatEquals(evenComesFirst, 0.0) * floatEquals(outputtingToEven, 0.0) * vec2(peerIndex.xy);

	// get byte values
	vec4 alphaData = texture2D(u_data, alphaIndex.xy / TEXTURE_WIDTH);
	vec4 bravoData = texture2D(u_data, bravoIndex.xy / TEXTURE_WIDTH);

	// initializing booleans to false
	float swapBool = 0.0;
	float notSwapBool = 0.0;

	// compare each byte in order to determine if swap is necessary
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.r, bravoData.r);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.r, bravoData.r);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.g, bravoData.g);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.g, bravoData.g);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.b, bravoData.b);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.b, bravoData.b);
	swapBool    += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatGreaterThan(alphaData.a, bravoData.a);
	notSwapBool += floatEquals(swapBool, 0.0) * floatEquals(notSwapBool, 0.0) * floatLessThan(alphaData.a, bravoData.a);

	// handle edge case where bytes are identical and thus both booleans are false
	notSwapBool += floatEquals(notSwapBool, 0.0) * floatEquals(swapBool, 0.0);

	// use booleans to render the correct index texel
	gl_FragColor = peerIndexTexel * floatEquals(swapBool, 1.0)
	 			 + currentIndexTexel * floatEquals(notSwapBool, 1.0);
}
