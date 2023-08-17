module.exports = {
    "roots": [
        "test"
    ],
    "transform": {
        "^.+\\.ts$": "ts-jest"
    },
    "reporters": ["default", "github-actions"],
    "globals": {
        "LOAD_CLD": false
    }
}; 
