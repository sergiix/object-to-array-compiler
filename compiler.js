const ID = 'ID',
    SKIP = 'SKIP',
    LBRA = 'LBRA',
    RBRA = 'RBRA',
    LPAR = 'LPAR',
    RPAR = 'RPAR',
    COLON = 'COLON',
    L_SQUARE_BRA ='L_SQUARE_BRA',
    R_SQUARE_BRA = 'R_SQUARE_BRA',
    QUOTE = 'QUOTE',
    DOUBLE_QUOTE = 'DOUBLE_QUOTE',
    COMMA = 'COMMA',
    SLASH = 'SLASH',
    DOT = 'DOT',
    COMMENT = 'COMMENT',
    EOL = 'EOL',
    ASTERISK = 'ASTERISK',
    PROGRAM = 'PROGRAM',
    OBJECT = 'OBJECT',
    PROPERTY = 'PROPERTY',
    PROPERTIES = 'PROPERTIES',
    KEY = 'KEY',
    VALUE = 'VALUE',
    ARRAY = 'ARRAY',
    STRING = 'STRING',
    NONE = null;

const CHARS = [
    ['\n', EOL],
    [/\w/, ID],
    ['{' , LBRA],
    ['}' , RBRA],
    ['[' , L_SQUARE_BRA],
    [']' , R_SQUARE_BRA],
    ["'" , QUOTE],
    [',' , COMMA],
    ['.', DOT],
    ['/', SLASH],
    ['*', ASTERISK],
    [':', COLON],
    ['(', LPAR],
    [')', RPAR],
    ['#' , COMMENT],
    [/\s/, SKIP]
];

let Node = (kind, value, payload) => ({kind, value, payload});

function Lexer(str) {
    let i = 0;
    let end = () => i >= str.length;
    let next = () => ++i;
    let ch = () => str[i];
    let symbol = c => {
        for(let i in CHARS){
            let val = CHARS[i][0];
            if (val instanceof RegExp && val.test(c) || val == c)
                return CHARS[i][1];
        }
        throw new Error('[StateManagerLexer] Syntax error. Unexpected symbol: ' + c)
    };
    let until = sym => { for (var c=ch(), v=''; !end() && sym==symbol(c); v+=c, next(), c=ch()); return v };
    let till = sym => { for(var c=ch(), v=''; !end() && sym!=symbol(c); v+=c, next(), c=ch()); return v };
    function token () {
        let type = NONE;
        let value = NONE;
        while(!end()) {
            let c = ch();
            let sym = symbol(c);
            next();
            switch(sym) {
                case LBRA:   type = sym; break;
                case RBRA:   type = sym; break;
                case ID:     type = sym; value = c + until(sym); break;
                case COMMA:  type = sym; break;
                case COLON:  type = sym; break;
                case COMMENT:type = sym; value = c + till(EOL); next(); break;
                case L_SQUARE_BRA: type = sym; break;
                case R_SQUARE_BRA: type = sym; break;
                case QUOTE:  type = QUOTE; value = till(QUOTE); next(); break;
                case EOL:
                case SKIP: continue
            }
            break
        }
        if (!type)
            return false;
        return { type, value }
    }
    return { token }
}


function Parser(lexer) {
    let token = lexer.token();
    let next = () => token = lexer.token();
    function skip(type) {
        if (token.type == type) {
            next();
            return true
        }
        return false
    }
    function key_statement() {
        let name = NONE;
        if ([QUOTE, ID].indexOf(token.type) < 0)
            return error('expected <quote> or <alpha>');
        if (token.type == QUOTE) {
            name = string_statement();
            skip(QUOTE)
        }
        if (token.type == ID)
            name = id_statement();
        return Node(KEY, name.value)
    }
    function id_statement () {
        if (token.type != ID)
            return error('expected ID');
        let node = Node(KEY, token.value);
        next();
        return node
    }

    function string_statement() {
        if (token.type != QUOTE)
            return error('expected "');
        return Node(STRING, token.value)
    }

    function array_statement () {
        let list = [];
        if (token.type != L_SQUARE_BRA) return error('expected "["');
        next();
        while(token && token.type != R_SQUARE_BRA) {
            if (token.type == QUOTE)
                list.push(string_statement());
            else if (token.type == COMMA) {}
            else return error('expected QUOTE or COMMA in array');
            next()
        }
        if (token.type != R_SQUARE_BRA) return error('expected "]"');
        return Node(ARRAY, list)
    }

    function property_statement () {
        let key = key_statement();
        let value = NONE;
        skip(COLON);
        if (token.type == LBRA) value = object_statement();
        if (token.type == L_SQUARE_BRA) value = array_statement();
        skip(COMMA);
        key.payload = value;
        next();
        return Node(PROPERTY, key)
    }

    function properties_statement () {
        let list = [];
        next();
        while (token && token.type != RBRA ) {
            if (skip(COMMA)) continue;
            if (skip(COMMENT)) continue;
            list.push(property_statement())
        }
        return Node(PROPERTIES, list)
    }

    function object_statement () {
        if (token.type != LBRA) return error('expected "{"');
        let properties = properties_statement();
        if (token.type != RBRA)
            return error('expected }');
        return Node(OBJECT, properties)
    }

    let error = message => { throw new Error('[StateManagerParser] Parser error: ' + message) };

    return Node(PROGRAM, object_statement())
}


function Compiler(str, thatLexer, thatParser) {
    let lexer = thatLexer || new Lexer(str);
    let parser = thatParser || new Parser(lexer);


    function node(n) {
        let {kind, value, payload} = n;

        switch(kind) {
            case PROGRAM:    return node(value);
            case OBJECT:     return node(value);
            case STRING:     return value;
            case KEY:        return [value, node(payload)];
            case PROPERTY:   return node(value);
            case PROPERTIES: {
                let actions = [];
                for(let i in value)
                    actions.push(node(value[i]))
                return actions;
            }
            case ARRAY: {
                let res = [];
                for(let i=0; i<value.length; i++)
                    res.push(value[i].value)
                return new Actions(res)
            }
        }
    }

    return node(parser)
}

function Actions(data) {
    this.data = data;
}

Actions.prototype.getData = function () {
    return this.data;
};

Compiler.Parse = Parser;
Compiler.Lexer = Lexer;
Compiler.Actions = Actions;

export default Compiler