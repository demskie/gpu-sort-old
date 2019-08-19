precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_scanned;

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
bool getMSB(float f) { return bool(floatGreaterThanOrEqual(f * 255.0, 128.0)); }
float clearMSB(float f) { return (f * 255.0 - floatGreaterThanOrEqual(f * 255.0, 128.0) * 128.0) / 255.0; }
float setMSB(float f, bool b) { return (f * 255.0 + float(b) * floatGreaterThanOrEqual(f * 255.0, 128.0) * 128.0) / 255.0; }

void main() {
	// pull current coordinates and remove bit value
	vec4 currentTexel = texture2D(u_scanned, gl_FragCoord.xy / TEXTURE_WIDTH);
	bool currentBitFlag = getMSB(currentTexel.r); 
	currentTexel.r = clearMSB(currentTexel.r);
	vec2 currentCoord = vec2(vec2ToInt16(currentTexel.rg), vec2ToInt16(currentTexel.ba));

	// pull previous coordinates and remove bit value
	vec4 previousTexel = texture2D(u_scanned, addToVec2(vec2(gl_FragCoord.xy), -1.0, TEXTURE_WIDTH) / TEXTURE_WIDTH);
	previousTexel.r = clearMSB(previousTexel.r);
	vec2 previousCoord = vec2(vec2ToInt16(previousTexel.rg), vec2ToInt16(previousTexel.ba));

	// pull last coordinates and remove bit value
	vec4 lastTexel = texture2D(u_scanned, vec2(TEXTURE_WIDTH - 0.5, TEXTURE_WIDTH - 0.5) / TEXTURE_WIDTH);
	lastTexel.r = clearMSB(lastTexel.r);
	vec2 lastCoord = vec2(vec2ToInt16(lastTexel.rg), vec2ToInt16(lastTexel.ba));

	// create an empty scatterCoord 
	vec2 scatterCoord = vec2(0.0, 0.0);

	// determine if this is the first texel
	float isFirstTexel = min(floatEquals(floor(gl_FragCoord.x), 0.0), 
							 floatEquals(floor(gl_FragCoord.y), 0.0));

	// if currentBitFlag == 0 && isFirstTexel == 0
	scatterCoord += floatEquals(float(currentBitFlag), 0.0)
			      * floatEquals(isFirstTexel, 0.0)
			      * previousCoord.xy;
	
	// if currentBitFlag == 1 && isFirstTexel == 1
	scatterCoord += floatEquals(float(currentBitFlag), 1.0)
			      * floatEquals(isFirstTexel, 1.0)
			      * vec2(floor(gl_FragCoord.x) + lastCoord.x, 
				         floor(gl_FragCoord.y) + lastCoord.y);
	
	// if currentBitFlag == 1 && isFirstTexel == 0
	scatterCoord += floatEquals(float(currentBitFlag), 1.0)
			      * floatEquals(isFirstTexel, 0.0)
			      * vec2(floor(gl_FragCoord.x - previousCoord.x + lastCoord.x), 
				         floor(gl_FragCoord.y - previousCoord.y + lastCoord.y));

	// output scatter coordinates
	gl_FragColor = vec4(int16ToVec2(scatterCoord.x), int16ToVec2(scatterCoord.y));
}