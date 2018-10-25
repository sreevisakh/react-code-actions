const vscode = require('vscode');
const pkg = require('./package.json');
const Parser = require('./parser');

const commands = pkg.contributes.commands.map(item => item.command.replace('onCommand:',''))

function activate(context) {
    try {
        let disposables = commands.map(command => vscode.commands.registerCommand(command, function () {
            const editor = vscode.window.activeTextEditor
            const selection = editor.selection
            const text = editor.document.getText(selection);
            const filePath = editor.document.fileName;
            switch(command){
                case 'add-to-proptypes':
                    vscode.window.showQuickPick(pkg.propTypes).then(response => {
                        if(!response) return;
                        let parser = new Parser();
                        parser.addToPropTypes(filePath, text, response)
                    })
                    return;
                case 'add-handler-function':
                    let parser = new Parser();
                    parser.addHandlerFunction(filePath, text)
                    return;
            }
           
        }))
        context.subscriptions = context.subscriptions.concat(disposables);
    } catch (error) {
        console.error(error)
    }

}


// this method is called when your extension is deactivated
function deactivate() {
}

exports.deactivate = deactivate;
exports.activate = activate;