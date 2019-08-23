#ifdef GL_ES
precision mediump float;
precision mediump int;
precision mediump sampler2D;
#endif

attribute vec3 position;

uniform sampler2D u_scatter;

const float TEXTURE_WIDTH = 1.0;

float vec2ToUint16(vec2 v);

void main() {
	vec4 scatterTexel = texture2D(u_scatter, position.xy);
	vec2 scatterCoord = vec2(vec2ToUint16(scatterTexel.rg) + 0.5, 
							 vec2ToUint16(scatterTexel.ba) + 0.5) / TEXTURE_WIDTH;
	gl_Position = vec4(scatterCoord.x, scatterCoord.y, position.z, 1.0);
}