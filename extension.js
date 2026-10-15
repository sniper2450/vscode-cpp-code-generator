const vscode = require('vscode');

// Главная функция активации расширения. Она запускается один раз при старте плагина и регистрирует команды в системе.

function activate(context) {
    
    let disposable = vscode.commands.registerCommand('code-generator.openForm', async function () {
        
        const blockType = await vscode.window.showQuickPick(
            [
                { label: 'if', description: 'Условный оператор if (...) {}' },
                { label: 'for', description: 'Цикл со счетчиком for (int i = 0; ...)' },
                { label: 'while', description: 'Цикл с предусловием while (...) {}' }
            ], 
            { placeHolder: 'Выберите конструкции C++ для генерации' }
        );

        if (!blockType) return;

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Нет активного окна редактора!');
            return;
        }

        let generatedCode = '';
        const comment = '// TODO: Your code here';
        const globalDeclarations = new Set();

        // Вспомогательная функция для поиска и извлечения переменных из строк ввода.
        // Пример: строка "int a > 5 && int b == 0" превратится в "a > 5 && b == 0",
        // а строки "int a;\n" и "int b;\n" будут сохранены в globalDeclarations для вынесения наверх.
        // Функция находит базовые типы данных C++ и заменяет их объявления на чистые имена переменных.
        
        function parseInlineDeclarations(conditionText) {
            let cleanCondition = conditionText;
            const declRegex = /\b(int|double|float|bool|char|std::string)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
            let match;

            while ((match = declRegex.exec(conditionText)) !== null) {
                globalDeclarations.add(`${match[1]} ${match[2]};\n`);
                cleanCondition = cleanCondition.replace(match[0], match[2]);
            }
            return cleanCondition;
        }

        if (blockType.label === 'if') {
            const condition = await vscode.window.showInputBox({
                prompt: 'Введите условие для if (можно объявлять переменные, например: int a > 0)',
                value: 'true'
            });
            if (condition === undefined) return; 
            
            const cleanCondition = parseInlineDeclarations(condition);
            const prependedCode = Array.from(globalDeclarations).join('');
            generatedCode = `${prependedCode}if (${cleanCondition}) {\n${comment}\n}`;

        } else if (blockType.label === 'for') {
            const varName = await vscode.window.showInputBox({
                prompt: 'Имя переменной-счетчика',
                value: 'i',
                validateInput: text => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text) ? null : 'Невалидное имя переменной в C++'
            });
            if (!varName) return;

            const start = await vscode.window.showInputBox({
                prompt: 'Начальное значение (например: 0 или int startVal)',
                value: '0'
            });
            if (start === undefined) return;

            const end = await vscode.window.showInputBox({
                prompt: 'Конечное значение (не включая его, например: 10 или int limit)',
                value: '10'
            });
            if (end === undefined) return;

            const cleanStart = parseInlineDeclarations(start);
            const cleanEnd = parseInlineDeclarations(end);
            const prependedCode = Array.from(globalDeclarations).join('');
            generatedCode = `${prependedCode}for (int ${varName} = ${cleanStart}; ${varName} < ${cleanEnd}; ++${varName}) {\n${comment}\n}`;

        } else if (blockType.label === 'while') {
            const condition = await vscode.window.showInputBox({
                prompt: 'Введите условие для цикла (можно объявлять переменные, например: int a > 0)',
                value: 'true'
            });
            if (condition === undefined) return;

            const cleanCondition = parseInlineDeclarations(condition);
            const prependedCode = Array.from(globalDeclarations).join('');
            generatedCode = `${prependedCode}while (${cleanCondition}) {\n${comment}\n}`;
        }

        const startPosition = editor.selection.active;
        await editor.edit(editBuilder => {
            editBuilder.insert(startPosition, generatedCode);
        });

        await vscode.commands.executeCommand('editor.action.formatDocument');
    });

    context.subscriptions.push(disposable);
}

// Функция деактивации расширения. Вызывается автоматически средой разработки при выключении или удалении плагина.

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
