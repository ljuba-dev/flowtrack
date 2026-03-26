import { createToken, Lexer, CstParser } from 'chevrotain';

// Tokens
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });
const Comment = createToken({ name: 'Comment', pattern: /\/\*\*[\s\S]*?\*\/|\/\/.*/ });
const FlowHelperDecorator = createToken({ name: 'FlowHelperDecorator', pattern: /@FlowHelper/ });
const FlowTestDecorator = createToken({ name: 'FlowTestDecorator', pattern: /@FlowTest/ });
const FlowDecorator = createToken({ name: 'FlowDecorator', pattern: /@Flow/ });
const LRound = createToken({ name: 'LRound', pattern: /\(/ });
const RRound = createToken({ name: 'RRound', pattern: /\)/ });
const LCurly = createToken({ name: 'LCurly', pattern: /\{/ });
const RCurly = createToken({ name: 'RCurly', pattern: /\}/ });
const LSquare = createToken({ name: 'LSquare', pattern: /\[/ });
const RSquare = createToken({ name: 'RSquare', pattern: /\]/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /'[^']*'|"[^"]*"/ });
const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+/ });
const Colon = createToken({ name: 'Colon', pattern: /:/ });
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });
const Async = createToken({ name: 'Async', pattern: /async\b/ });
const FunctionKW = createToken({ name: 'FunctionKW', pattern: /function\b/ });
const ClassKW = createToken({ name: 'ClassKW', pattern: /class\b/ });
const ExportKW = createToken({ name: 'ExportKW', pattern: /export\b/ });
const PublicKW = createToken({ name: 'PublicKW', pattern: /public\b/ });
const PrivateKW = createToken({ name: 'PrivateKW', pattern: /private\b/ });
const ProtectedKW = createToken({ name: 'ProtectedKW', pattern: /protected\b/ });
const StaticKW = createToken({ name: 'StaticKW', pattern: /static\b/ });
const ReadonlyKW = createToken({ name: 'ReadonlyKW', pattern: /readonly\b/ });
const DecoratorToken = createToken({ name: 'DecoratorToken', pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/ });
const Dot = createToken({ name: 'Dot', pattern: /\./ });
const SemiColon = createToken({ name: 'SemiColon', pattern: /;/ });
const Arrow = createToken({ name: 'Arrow', pattern: /=>/ });
const Equals = createToken({ name: 'Equals', pattern: /=/ });
const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
const LessThan = createToken({ name: 'LessThan', pattern: /</ });
const ConstKW = createToken({ name: 'ConstKW', pattern: /const\b/ });
const LetKW = createToken({ name: 'LetKW', pattern: /let\b/ });
const VarKW = createToken({ name: 'VarKW', pattern: /var\b/ });

const allTokens = [
  WhiteSpace,
  Comment,
  FlowHelperDecorator,
  FlowTestDecorator,
  FlowDecorator,
  LRound,
  RRound,
  LCurly,
  RCurly,
  LSquare,
  RSquare,
  Comma,
  StringLiteral,
  NumberLiteral,
  Colon,
  SemiColon,
  Dot,
  Arrow,
  Equals,
  GreaterThan,
  LessThan,
  ConstKW,
  LetKW,
  VarKW,
  Async,
  FunctionKW,
  ClassKW,
  ExportKW,
  PublicKW,
  PrivateKW,
  ProtectedKW,
  StaticKW,
  ReadonlyKW,
  DecoratorToken,
  Identifier
];

const FlowLexer = new Lexer(allTokens);

class FlowParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  public program = this.RULE('program', () => {
    this.MANY(() => {
      this.OR([
        { GATE: () => this.LA(1).tokenType === ExportKW || this.LA(1).tokenType === ClassKW || (this.LA(1).tokenType === FlowDecorator && this.isClassNext()) || (this.LA(1).tokenType === FlowHelperDecorator && this.isClassNext()) || (this.LA(1).tokenType === FlowTestDecorator && this.isClassNext()),
          ALT: () => this.SUBRULE(this.classDeclaration) },
        { GATE: () => this.LA(1).tokenType === FunctionKW || this.LA(1).tokenType === Async || this.LA(1).tokenType === FlowDecorator || this.LA(1).tokenType === FlowHelperDecorator || this.LA(1).tokenType === FlowTestDecorator || (this.LA(1).tokenType === Comment && (this.LA(2).tokenType === FlowDecorator || this.LA(2).tokenType === FlowHelperDecorator || this.LA(2).tokenType === FlowTestDecorator || this.LA(2).tokenType === FunctionKW || this.LA(2).tokenType === Async)),
          ALT: () => this.SUBRULE(this.decoratedFunction) },
        { ALT: () => this.CONSUME(Comment) },
        { ALT: () => this.CONSUME(ExportKW) },
        { ALT: () => this.CONSUME(Identifier) },
        { ALT: () => this.CONSUME(StringLiteral) },
        { ALT: () => this.CONSUME(NumberLiteral) },
        { ALT: () => this.CONSUME(LRound) },
        { ALT: () => this.CONSUME(RRound) },
        { ALT: () => this.CONSUME(LCurly) },
        { ALT: () => this.CONSUME(RCurly) },
        { ALT: () => this.CONSUME(LSquare) },
        { ALT: () => this.CONSUME(RSquare) },
        { ALT: () => this.CONSUME(Comma) },
        { ALT: () => this.CONSUME(Colon) },
        { ALT: () => this.CONSUME(SemiColon) },
        { ALT: () => this.CONSUME(Dot) },
        { ALT: () => this.CONSUME(Arrow) },
        { ALT: () => this.CONSUME(Equals) },
        { ALT: () => this.CONSUME(Async) },
        { ALT: () => this.CONSUME(ConstKW) },
        { ALT: () => this.CONSUME(LetKW) },
        { ALT: () => this.CONSUME(VarKW) },
        { ALT: () => this.CONSUME(FunctionKW) },
        { ALT: () => this.CONSUME(DecoratorToken) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(GreaterThan) },
      ]);
    });
  });

  private isClassNext(): boolean {
      let i = 1;
      let token = this.LA(i);
      while (token.tokenType.name !== 'EOF' && i < 15) {
          if (token.tokenType === ClassKW) return true;
          i++;
          token = this.LA(i);
      }
      return false;
  }

  private classDeclaration = this.RULE('classDeclaration', () => {
    this.OPTION(() => this.CONSUME(ExportKW));
    this.MANY(() => this.SUBRULE(this.decorator));
    this.CONSUME(ClassKW);
    this.CONSUME(Identifier, { LABEL: 'className' });
    this.MANY1(() => {
        this.OR([
            { ALT: () => this.CONSUME1(Identifier) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(LessThan) },
            { ALT: () => this.CONSUME(GreaterThan) },
        ]);
    });
    this.CONSUME(LCurly);
    this.MANY2(() => {
        this.OR1([
            { GATE: () => (this.LA(1).tokenType === Identifier && this.LA(2).tokenType === LRound) || this.LA(1).tokenType === FlowDecorator || this.LA(1).tokenType === FlowHelperDecorator || this.LA(1).tokenType === FlowTestDecorator || this.LA(1).tokenType === PublicKW || this.LA(1).tokenType === PrivateKW || this.LA(1).tokenType === ProtectedKW || this.LA(1).tokenType === StaticKW || this.LA(1).tokenType === ReadonlyKW || this.LA(1).tokenType === Async || (this.LA(1).tokenType === Comment && (this.LA(2).tokenType === FlowDecorator || this.LA(2).tokenType === FlowHelperDecorator || this.LA(2).tokenType === FlowTestDecorator)),
              ALT: () => this.SUBRULE(this.classMethod) },
            { GATE: () => this.LA(1).tokenType === Identifier && this.LA(2).tokenType !== LRound,
              ALT: () => this.SUBRULE(this.classProperty) },
            { ALT: () => this.CONSUME(Comment) },
            { ALT: () => this.CONSUME2(Identifier) },
            { ALT: () => this.CONSUME(SemiColon) },
            { ALT: () => this.CONSUME(LRound) },
            { ALT: () => this.CONSUME(RRound) },
            { ALT: () => this.CONSUME(LSquare) },
            { ALT: () => this.CONSUME(RSquare) },
            { ALT: () => this.CONSUME(Equals) },
            { ALT: () => this.CONSUME1(Comma) },
            { ALT: () => this.CONSUME(Colon) },
            { ALT: () => this.CONSUME(Dot) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME1(LessThan) },
            { ALT: () => this.CONSUME1(GreaterThan) },
            { ALT: () => this.CONSUME(FlowDecorator) },
            { ALT: () => this.CONSUME(FlowHelperDecorator) },
            { ALT: () => this.CONSUME(FlowTestDecorator) },
            { ALT: () => this.CONSUME(DecoratorToken) },
            { ALT: () => this.CONSUME(PublicKW) },
            { ALT: () => this.CONSUME(PrivateKW) },
            { ALT: () => this.CONSUME(ProtectedKW) },
            { ALT: () => this.CONSUME(StaticKW) },
            { ALT: () => this.CONSUME(ReadonlyKW) },
            { ALT: () => this.CONSUME(Async) },
        ]);
    });
    this.OPTION3(() => this.CONSUME1(RCurly));
  });

  private classMethod = this.RULE('classMethod', () => {
    this.OPTION(() => this.CONSUME(Comment, { LABEL: 'doc' }));
    this.MANY(() => this.SUBRULE(this.decorator));
    this.OPTION1(() => this.SUBRULE(this.modifiers));
    this.OPTION2(() => this.CONSUME(Async));
    this.CONSUME(Identifier, { LABEL: 'functionName' });
    this.OPTION3(() => this.SUBRULE(this.typeParameters));
    this.SUBRULE(this.functionArgs);
    this.OPTION4(() => {
        this.CONSUME(Colon);
        this.MANY1(() => {
            this.OR([
                { ALT: () => this.CONSUME1(Identifier) },
                { ALT: () => this.CONSUME(LessThan) },
                { ALT: () => this.CONSUME(GreaterThan) },
                { ALT: () => this.CONSUME(LCurly) },
                { ALT: () => this.CONSUME(RCurly) },
                { ALT: () => this.CONSUME(LRound) },
                { ALT: () => this.CONSUME(RRound) },
                { ALT: () => this.CONSUME(Comma) },
                { ALT: () => this.CONSUME(Dot) },
                { ALT: () => this.CONSUME(SemiColon) },
                { ALT: () => this.CONSUME(LSquare) },
                { ALT: () => this.CONSUME(RSquare) },
            ]);
        });
    });
    this.MANY2(() => this.SUBRULE(this.functionBody));
  });

  private classProperty = this.RULE('classProperty', () => {
    this.OPTION(() => this.SUBRULE(this.modifiers));
    this.CONSUME(Identifier);
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME1(Identifier) },
            { ALT: () => this.CONSUME(Colon) },
            { ALT: () => this.CONSUME(Equals) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(LCurly) },
            { ALT: () => this.CONSUME(RCurly) },
            { ALT: () => this.CONSUME(LRound) },
            { ALT: () => this.CONSUME(RRound) },
            { ALT: () => this.CONSUME(LessThan) },
            { ALT: () => this.CONSUME(GreaterThan) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(Dot) },
        ]);
    });
    this.OPTION1(() => this.CONSUME(SemiColon));
  });

  private modifiers = this.RULE('modifiers', () => {
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME(PublicKW) },
            { ALT: () => this.CONSUME(PrivateKW) },
            { ALT: () => this.CONSUME(ProtectedKW) },
            { ALT: () => this.CONSUME(StaticKW) },
            { ALT: () => this.CONSUME(ReadonlyKW) },
        ]);
    });
  });

  private decoratedFunction = this.RULE('decoratedFunction', () => {
    this.OPTION(() => this.CONSUME(Comment, { LABEL: 'doc' }));
    this.MANY(() => {
        this.SUBRULE(this.decorator);
    });
    this.OR([
        {
            GATE: () => this.LA(1).tokenType === FunctionKW || this.LA(1).tokenType === Async,
            ALT: () => {
                this.OPTION1(() => this.CONSUME(Async));
                this.CONSUME(FunctionKW);
                this.CONSUME(Identifier, { LABEL: 'functionName' });
                this.SUBRULE(this.functionArgs);
                this.OPTION2(() => this.SUBRULE(this.returnType));
                this.SUBRULE(this.functionBody);
            }
        },
        {
            GATE: () => this.LA(1).tokenType === Identifier && this.LA(2).tokenType === LRound,
            ALT: () => {
                this.CONSUME1(Identifier, { LABEL: 'functionName' });
                this.SUBRULE1(this.functionArgs);
                this.OPTION3(() => this.SUBRULE1(this.returnType));
                this.SUBRULE1(this.functionBody);
            }
        },
        {
            GATE: () => this.LA(1).tokenType === ConstKW || this.LA(1).tokenType === LetKW || this.LA(1).tokenType === VarKW,
            ALT: () => {
                this.OR1([
                    { ALT: () => this.CONSUME(ConstKW) },
                    { ALT: () => this.CONSUME(LetKW) },
                    { ALT: () => this.CONSUME(VarKW) }
                ]);
                this.CONSUME2(Identifier, { LABEL: 'functionName' });
                this.CONSUME(Equals);
                this.OPTION4(() => this.CONSUME1(Async));
                this.OR2([
                    {
                        GATE: () => this.LA(1).tokenType === FunctionKW,
                        ALT: () => {
                            this.CONSUME1(FunctionKW);
                            this.OPTION5(() => this.CONSUME3(Identifier));
                            this.SUBRULE2(this.functionArgs);
                            this.OPTION6(() => this.SUBRULE2(this.returnType));
                            this.SUBRULE2(this.functionBody);
                        }
                    },
                    { ALT: () => this.SUBRULE(this.arrowFunctionExpression) }
                ]);
                this.OPTION7(() => this.CONSUME(SemiColon));
            }
        }
    ]);
  });

  private returnType = this.RULE('returnType', () => {
    this.CONSUME(Colon);
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(LessThan) },
            { ALT: () => this.CONSUME(GreaterThan) },
            { ALT: () => this.CONSUME(LRound) },
            { ALT: () => this.CONSUME(RRound) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(Dot) },
        ]);
    });
  });

  private arrowFunctionExpression = this.RULE('arrowFunctionExpression', () => {
    this.OR([
        { ALT: () => this.SUBRULE(this.functionArgs) },
        { ALT: () => this.CONSUME(Identifier) }
    ]);
    this.CONSUME(Arrow);
    this.SUBRULE(this.functionBody);
  });

  private decorator = this.RULE('decorator', () => {
    this.OR([
        { ALT: () => {
            this.CONSUME(FlowDecorator);
            this.OPTION(() => this.SUBRULE(this.decoratorArgs, { LABEL: 'args' }));
        }},
        { ALT: () => {
            this.CONSUME(FlowHelperDecorator);
            this.OPTION1(() => this.SUBRULE1(this.decoratorArgs, { LABEL: 'args' }));
        }},
        { ALT: () => {
            this.CONSUME(FlowTestDecorator);
            this.OPTION2(() => this.SUBRULE2(this.decoratorArgs, { LABEL: 'args' }));
        }}
    ]);
  });

  private decoratorArgs = this.RULE('decoratorArgs', () => {
    this.CONSUME(LRound);
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            { ALT: () => this.CONSUME(Comma) }
        ]);
    });
    this.OPTION(() => this.CONSUME(RRound));
  });

  private typeParameters = this.RULE('typeParameters', () => {
    this.CONSUME(LessThan);
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(Colon) },
            { ALT: () => this.CONSUME1(LessThan) },
            { ALT: () => this.CONSUME(LSquare) },
            { ALT: () => this.CONSUME(RSquare) },
            { ALT: () => this.CONSUME(Dot) },
        ]);
    });
    this.CONSUME2(GreaterThan);
  });

  private objectLiteral = this.RULE('objectLiteral', () => {
    this.CONSUME(LCurly);
    this.MANY_SEP({
        SEP: Comma,
        DEF: () => {
            this.SUBRULE(this.objectProperty);
        }
    });
    this.CONSUME(RCurly);
  });

  private objectProperty = this.RULE('objectProperty', () => {
    this.CONSUME(Identifier, { LABEL: 'key' });
    this.CONSUME(Colon);
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral, { LABEL: 'stringValue' }) },
      { ALT: () => this.CONSUME(NumberLiteral, { LABEL: 'numberValue' }) },
      { ALT: () => this.SUBRULE(this.arrayLiteral, { LABEL: 'arrayValue' }) },
    ]);
  });

  private arrayLiteral = this.RULE('arrayLiteral', () => {
    this.CONSUME(LSquare);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        this.CONSUME(StringLiteral);
      }
    });
    this.CONSUME(RSquare);
  });

  private functionArgs = this.RULE('functionArgs', () => {
    this.CONSUME(LRound);
    this.MANY(() => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(Colon) },
            { ALT: () => this.CONSUME(LCurly) },
            { ALT: () => this.CONSUME(RCurly) },
            { ALT: () => this.CONSUME(Equals) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(LessThan) },
            { ALT: () => this.CONSUME(GreaterThan) },
            { ALT: () => this.CONSUME(Dot) },
            { ALT: () => this.CONSUME(SemiColon) },
            { ALT: () => this.CONSUME(LSquare) },
            { ALT: () => this.CONSUME(RSquare) },
        ]);
    });
    this.CONSUME(RRound);
  });

  private functionBody = this.RULE('functionBody', () => {
    this.OR([
        { GATE: () => this.LA(1).tokenType === LCurly,
          ALT: () => {
            this.CONSUME(LCurly);
            this.MANY({
                GATE: () => this.LA(1).tokenType !== RCurly,
                DEF: () => {
                    this.OR1([
                        { ALT: () => this.CONSUME(Comment) },
                        { ALT: () => this.CONSUME(Identifier) },
                        { ALT: () => this.CONSUME(StringLiteral) },
                        { ALT: () => this.CONSUME(NumberLiteral) },
                        { ALT: () => this.CONSUME(LRound) },
                        { ALT: () => this.CONSUME(RRound) },
                        { ALT: () => this.CONSUME1(LCurly) },
                        { ALT: () => this.CONSUME(Comma) },
                        { ALT: () => this.CONSUME(Colon) },
                        { ALT: () => this.CONSUME(SemiColon) },
                        { ALT: () => this.CONSUME(Dot) },
                        { ALT: () => this.CONSUME(Arrow) },
                        { ALT: () => this.CONSUME(Equals) },
                        { ALT: () => this.CONSUME(Async) },
                        { ALT: () => this.CONSUME(ConstKW) },
                        { ALT: () => this.CONSUME(LetKW) },
                        { ALT: () => this.CONSUME(VarKW) },
                        { ALT: () => this.CONSUME(FunctionKW) },
                        { ALT: () => this.CONSUME(FlowDecorator) },
                        { ALT: () => this.CONSUME(FlowHelperDecorator) },
                        { ALT: () => this.CONSUME(FlowTestDecorator) },
                        { ALT: () => this.CONSUME(DecoratorToken) },
                        { ALT: () => this.CONSUME(LessThan) },
                        { ALT: () => this.CONSUME(GreaterThan) },
                        { ALT: () => this.CONSUME(LSquare) },
                        { ALT: () => this.CONSUME(RSquare) },
                        { ALT: () => this.CONSUME(ExportKW) },
                        { ALT: () => this.CONSUME(ClassKW) },
                        { ALT: () => this.CONSUME(PublicKW) },
                        { ALT: () => this.CONSUME(PrivateKW) },
                        { ALT: () => this.CONSUME(ProtectedKW) },
                        { ALT: () => this.CONSUME(StaticKW) },
                        { ALT: () => this.CONSUME(ReadonlyKW) },
                    ]);
                }
            });
            this.CONSUME(RCurly);
          }
        },
        { ALT: () => this.CONSUME1(SemiColon) },
        { ALT: () => this.CONSUME1(Comment) },
        { ALT: () => this.CONSUME1(Identifier) },
        { ALT: () => this.CONSUME1(Equals) },
        { ALT: () => this.CONSUME1(StringLiteral) },
        { ALT: () => this.CONSUME1(NumberLiteral) },
        { ALT: () => this.CONSUME1(Comma) },
        { ALT: () => this.CONSUME1(Dot) },
        { ALT: () => this.CONSUME1(Colon) },
    ]);
  });
}

export const parser = new FlowParser();
export function parse(text: string) {
    const lexingResult = FlowLexer.tokenize(text);
    parser.input = lexingResult.tokens;
    const cst = parser.program();
    return {
        cst,
        lexingResult,
        errors: parser.errors
    };
}
