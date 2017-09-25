import Compiler from './compiler';

let str = `
    {
        one {
            two ['111']
            'three' {
                'FOUR:yes:yes' ['222', '333', '444']
            }
        }

        five: ['2222222']

        six: {
            SEVEN: ['Come my lady', 'Come come my lady', 'You are my butterfly', 'sugar baby.']
        }
    }
`;

console.log('Source: ' + str);

let result = Compiler(str);

console.log("Compiler result: " + JSON.stringify(result, null, 3));

result = [
    [
        ["one", [
            ["two", ["111"]],
            ["three", [
                ["FOUR:yes:yes",["222","333","444"]]
            ]]
        ]],
        ["five", ["2222222"]],
        ["six",[
            ["SEVEN",["Come my lady", "Come come my lady","You are my butterfly","sugar baby."]]
        ]]
    ]
];