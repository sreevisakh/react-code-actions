const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require('babel-generator').default;
const t = require("@babel/types");
const fs = require('fs');
const prettier = require("prettier");

class Parser {
  constructor() {
    this.flags = {
      propTypesFound: false
    }
    this.refs = {}
  }
  addHandlerFunction(filePath, text) {
    const code = fs.readFileSync(filePath).toString();
    const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx", "classProperties", "objectRestSpread"] });
    this.preProcess(ast);

    if (!this.flags.hasConstructor) {
      this.insertConstructor()
    }

    this.insertHandleFunction(text)

    let result = generate(ast, {
      retainLines: true,
      compact: false,
      concise: false,
      quotes: "single",
      sourceMaps: true
    }, code);

    let formattedResult = prettier.format(result.code, { parser: 'babylon' });

    try {
      fs.writeFileSync(filePath, formattedResult, 'utf-8');
    } catch (error) {
      console.error(error)
    }
  }
  insertConstructor() {
    this.refs.classBody.body.unshift(
      t.classMethod(
        "constructor",
        t.identifier('constructor'), 
        [], 
        t.blockStatement([])
      )
    )
    this.refs.constructorBody = this.refs.classBody.body[0].body
  }
  insertHandleFunction(name) {
    this.refs.constructorBody.push(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(
            t.thisExpression(), 
            t.identifier(name)
          ),
          t.callExpression(
            t.memberExpression(
              t.memberExpression(
                t.thisExpression(),
                t.identifier(name)
              ), 
              t.identifier("bind")
            ),
            [
              t.thisExpression()
            ]
          )
        )
      )
    )
    let classMethod = t.classMethod(
      "method", 
      t.identifier(name), 
      [], 
      t.blockStatement([])
    )
    if(this.refs.renderIndex){
      this.refs.classBody.body.splice(renderIndex-1 , 0, classMethod);
    } else {
      this.refs.classBody.body.push(classMethod)
    }

  }

  addToPropTypes(filePath, text, propType) {
    const code = fs.readFileSync(filePath).toString();
    const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx", "classProperties", "objectRestSpread"] });
    this.preProcess(ast);

    if (!this.flags.propTypeImported) {
      this.insertProtypeImport()
    }
    if (!this.flags.propTypesFound) {
      if (this.flags.isClass) {
        this.insertProptypeToClass()
      }
    }
    this.pushToPropTypes(text, propType)

    let result = generate(ast, {
      retainLines: true,
      compact: false,
      concise: false,
      quotes: "single",
      sourceMaps: true
    }, code);

    let formattedResult = prettier.format(result.code, { parser: 'babylon' });

    try {
      fs.writeFileSync(filePath, formattedResult, 'utf-8');
    } catch (error) {
      console.error(error)
    }

  }

  preProcess(ast) {
    traverse(ast, {
      enter: (path) => {
        if (path.node.type === 'ClassMethod' && path.node.key.name === 'constructor') {
          this.flags.hasConstructor = true
          this.refs.constructorBody = path.node.body.body;
        }
        if (path.node.type === 'ClassBody') {
          this.flags.isClass = true
          this.refs.classBody = path.node;
          for (let i=0; i < path.node.body.body.length; i++){
            let item = path.node.body.body[i];
            if(item.type === 'ClassMethod' && item.name === "render"){
              this.refs.renderIndex = i;
              break;
            }
          }
        }
        if (path.node.name === 'propTypes') {
          this.flags.propTypesFound = true;
          this.refs.propTypes = path.parent.value.properties
        }
        if (path.node.type === 'ImportDefaultSpecifier' && path.node.local.name === 'PropTypes') {
          this.flags.propTypeImported = true;
        }
        if (path.node.type === 'Program') {
          this.refs.programBody = path.node.body
        }

      }
    })
  }

  /**
   * Add import statement for PropTypes
   */
  insertProtypeImport() {
    this.refs.programBody.unshift(
      t.importDeclaration(
        [
          t.importDefaultSpecifier(
            t.identifier('PropTypes')
          )
        ],
        t.stringLiteral('prop-types')
      )
    )
  }
  /**
   *
   */
  insertProptypeToClass() {
    this.refs.classBody.body.unshift(t.classProperty(
      t.identifier('propTypes'),
      t.objectExpression([]),
    ))
    this.refs.propTypes = this.refs.classBody.body[0].value.properties
  }
  /**
   * 
   * @param {String} key property name
   * @param {String} type type of property
   */
  pushToPropTypes(key, type) {
    this.refs.propTypes.push(
      t.objectProperty(
        t.identifier(key),
        t.identifier('PropTypes.' + type)
      )
    )
  }
}

module.exports = Parser;