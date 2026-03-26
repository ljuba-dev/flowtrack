import { parser } from './parser';

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export interface FlowInfo {
    title: string;
    name?: string;
    step?: number;
    description?: string;
    helpers: string[];
    functionName: string;
    line?: number;
    uri?: string;
}

export interface FlowTestInfo {
    flow: string;
    name?: string;
    step?: number | string;
    description?: string;
    testType?: string;
    framework?: string;
    id?: string;
    tags?: string[];
    functionName: string;
    line?: number;
    uri?: string;
}

export interface FlowHelperInfo {
    name: string;
    description?: string;
    functionName: string;
    line?: number;
    uri?: string;
}

export interface FlowMap {
    flows: { [title: string]: FlowInfo[] };
    helpers: { [name: string]: FlowHelperInfo };
    tests?: { [flow: string]: FlowTestInfo[] };
}

class FlowVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    program(ctx: any) {
        const results: any[] = [];
        if (ctx.decoratedFunction) {
            ctx.decoratedFunction.forEach((func: any) => {
                const info = this.visit(func);
                if (info) results.push(info);
            });
        }
        if (ctx.classDeclaration) {
            ctx.classDeclaration.forEach((cls: any) => {
                const info = this.visit(cls);
                if (info) results.push(...info);
            });
        }
        return results;
    }

    classDeclaration(ctx: any) {
        const results: any[] = [];
        if (ctx.classMethod) {
            ctx.classMethod.forEach((method: any) => {
                const info = this.visit(method);
                if (info) results.push(...info);
            });
        }
        return results;
    }

    classMethod(ctx: any) {
        return this.decoratedFunction(ctx);
    }

    classProperty(ctx: any) {
        return null;
    }

    modifiers(ctx: any) {
        return null;
    }

    decoratedFunction(ctx: any) {
        const functionNameToken = ctx.functionName[0];
        const functionName = functionNameToken.image;
        const line = functionNameToken.startLine;
        const decorators = ctx.decorator ? ctx.decorator.map((d: any) => this.visit(d)) : [];
        const doc = ctx.doc ? ctx.doc[0].image : '';
        
        const results: any[] = [];
        const flowDecorator = decorators.find((d: any) => d.type === 'Flow');
        const helperDecorators = decorators.filter((d: any) => d.type === 'FlowHelper');
        const testDecorators = decorators.filter((d: any) => d.type === 'FlowTest');

        if (flowDecorator) {
            const configuredHelpers = Array.isArray(flowDecorator.helpers) ? flowDecorator.helpers : [];
            const inlineHelpers = helperDecorators.map((d: any) => d.title || functionName);
            const info: FlowInfo = {
                title: flowDecorator.title,
                name: flowDecorator.name,
                step: flowDecorator.step,
                description: flowDecorator.description || this.cleanDoc(doc),
                helpers: Array.from(new Set([...configuredHelpers, ...inlineHelpers])),
                functionName: functionName,
                line: line
            };
            results.push({ ...info, type: 'Flow' });
        }

        if (helperDecorators.length > 0) {
            helperDecorators.forEach((hd: any) => {
                results.push({
                    type: 'Helper',
                    name: hd.title || functionName,
                    description: hd.description || this.cleanDoc(doc),
                    functionName: functionName,
                    line: line
                });
            });
        }

        if (testDecorators.length > 0) {
            testDecorators.forEach((td: any) => {
                const docDescription = this.cleanDoc(doc);
                const fallbackName = td.name || functionName;
                const description = td.description || docDescription || fallbackName;
                const info: FlowTestInfo = {
                    flow: td.flow,
                    name: fallbackName,
                    step: td.step,
                    description,
                    testType: td.testType,
                    framework: td.framework,
                    id: td.id,
                    tags: td.tags,
                    functionName,
                    line
                };
                results.push({ ...info, type: 'FlowTest' });
            });
        }
        
        return results.length > 0 ? results : null;
    }

    decorator(ctx: any) {
        if (ctx.FlowDecorator) {
            const args = this.visit(ctx.args[0]);
            return {
                type: 'Flow',
                title: args.title,
                name: args.name,
                step: args.step,
                description: args.description,
                helpers: args.helpers
            };
        } else if (ctx.FlowHelperDecorator) {
            const args = ctx.args ? this.visit(ctx.args[0]) : {};
            return {
                type: 'FlowHelper',
                title: args.title || args.name, // Support both title and name
                description: args.description
            };
        } else {
            const args = ctx.args ? this.visit(ctx.args[0]) : {};
            const options = args.options || {};
            return {
                type: 'FlowTest',
                flow: args.title,
                name: options.name || args.name,
                step: options.step,
                description: options.description,
                testType: options.type,
                framework: options.framework,
                id: options.id,
                tags: options.tags
            };
        }
    }

    decoratorArgs(ctx: any) {
        const values: any[] = [];
        if (ctx.StringLiteral) {
            ctx.StringLiteral.forEach((s: any) => values.push(s.image.replace(/['"]/g, '')));
        }
        if (ctx.NumberLiteral) {
            ctx.NumberLiteral.forEach((n: any) => values.push(parseInt(n.image)));
        }
        if (ctx.objectLiteral) {
            values.push(this.visit(ctx.objectLiteral[0]));
        }

        if (values.length === 0) return {};
        
        let result: any = { title: values[0] };
        
        if (values.length === 2) {
            if (typeof values[1] === 'object') {
                result.options = values[1];
            } else {
                result.description = values[1];
            }
        } else if (values.length === 3) {
            if (typeof values[2] === 'object') {
                // title, name, options (used by @FlowTest)
                result.name = values[1];
                result.options = values[2];
            } else {
                // title, name, step
                result.name = values[1];
                result.step = values[2];
            }
        } else if (values.length >= 4) {
            // title, description, name, step
            result.description = values[1];
            result.name = values[2];
            result.step = values[3];
        }

        return result;
    }

    objectLiteral(ctx: any) {
        const obj: any = {};
        if (ctx.objectProperty) {
            ctx.objectProperty.forEach((property: any) => {
                const parsedProperty = this.visit(property);
                if (parsedProperty?.key) {
                    obj[parsedProperty.key] = parsedProperty.value;
                }
            });
        }
        return obj;
    }

    objectProperty(ctx: any) {
        const key = ctx.key?.[0]?.image;
        if (!key) return null;

        if (ctx.stringValue?.[0]) {
            return {
                key,
                value: ctx.stringValue[0].image.replace(/['"]/g, '')
            };
        }

        if (ctx.numberValue?.[0]) {
            return {
                key,
                value: parseInt(ctx.numberValue[0].image)
            };
        }

        if (ctx.arrayValue?.[0]) {
            return {
                key,
                value: this.visit(ctx.arrayValue[0])
            };
        }

        return { key, value: undefined };
    }

    arrayLiteral(ctx: any) {
        if (!ctx.StringLiteral) return [];
        return ctx.StringLiteral.map((s: any) => s.image.replace(/['"]/g, ''));
    }

    functionArgs(ctx: any) { return []; }
    typeParameters(ctx: any) { return []; }
    returnType(ctx: any) { return []; }
    arrowFunctionExpression(ctx: any) { return []; }
    functionBody(ctx: any) { return []; }

    private cleanDoc(doc: string): string {
        if (!doc) return '';
        if (doc.startsWith('//')) {
            return doc.replace('//', '').trim();
        }
        return doc
            .replace(/\/\*\*|\*\/|\*/g, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ');
    }
}

export const visitor = new FlowVisitor();

export function extractFlows(cst: any, uri?: string): FlowMap {
    const rawResults = (visitor.visit(cst) || []).flat(); // Flatten results as decoratedFunction now returns an array
    const flowMap: FlowMap = {
        flows: {},
        helpers: {},
        tests: {}
    };

    rawResults.forEach((res: any) => {
        if (!res) return;
        if (res.type === 'Flow') {
            if (!flowMap.flows[res.title]) flowMap.flows[res.title] = [];
            res.uri = uri;
            flowMap.flows[res.title].push(res);
        } else if (res.type === 'Helper') {
            res.uri = uri;
            flowMap.helpers[res.name] = res;
        } else if (res.type === 'FlowTest') {
            res.uri = uri;
            const flowName = res.flow || 'UnknownFlow';
            if (!flowMap.tests) flowMap.tests = {};
            if (!flowMap.tests[flowName]) flowMap.tests[flowName] = [];
            flowMap.tests[flowName].push(res);
        }
    });
    
    return flowMap;
}
