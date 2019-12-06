module.exports = () => ({
	plugins: [
		[
			require("babel-plugin-conditional-compile"), {
				"define": {
					"TARGET": "development"
				}
			}
		],
	],
});
