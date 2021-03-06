const returnTypeMap = require('./webdriver-return-types.json')

const changeType = (text) => {
    if (text.indexOf('Array.') > -1) {
        const arrayText = 'Array.<'
        text = text.substring(arrayText.length, text.length - 1) + '[]'
    }

    switch (text) {
    case 'Buffer':
    case 'Function':
    case 'RegExp':
    case 'Element':
    case 'Element[]': {
        break
    }
    default: {
        text = text.toLowerCase()
    }

    }
    return text
}

const getTypes = (types, alwaysType) => {
    types.forEach((type, index, array) => {
        array[index] = changeType(type)
    })
    types = types.join(' | ')
    if (types === '' && !alwaysType) {
        types = 'void'
    } else if (types === '*' || (types === '' && alwaysType)) {
        types = 'any'
    }

    return types
}

const buildCommand = (commandName, commandTags, indentation = 0, promisify = false) => {
    const allParameters = []
    let returnType = 'void'

    for (const { type, name, optional, types, string } of commandTags) {
        // dox parse {*} as string instead of types
        if (types && types.length === 0 && string.includes('{*}')) {
            types.push('*')
        }
        if (type === 'param') {
            let commandTypes = getTypes(types, true)

            // skipping param with dot in name that stands for Object properties description, ex: attachmentObject.name
            if (name.indexOf('.') < 0) {
                // get rid from default values from param name, ex: [paramName='someString'] will become paramName
                allParameters.push(`${name.split('[').pop().split('=')[0]}${optional ? '?' : ''}: ${commandTypes}`)
            }
        }

        if (type === 'return') {
            returnType = getTypes(types, false)
            returnType = returnType === 'object' ? (returnTypeMap[commandName] || 'ProtocolCommandResponse') : returnType
        }
    }

    // wrap with Promise
    returnType = promisify ? `Promise<${returnType}>` : returnType

    return `${commandName}(${allParameters.length > 0 ? `\n${' '.repeat(8 + indentation)}` : ''}${allParameters.join(`,\n${' '.repeat(8 + indentation)}`)}${allParameters.length > 0 ? `\n${' '.repeat(4 + indentation)}` : ''}): ${returnType}`
}

/**
 * get jsdoc from file
 * @param   {string} fileContent browser or element command file content
 * @param   {number} indentation
 * @returns {string}
 */
const getJsDoc = (commandName, fileContent, indentation = 0) => {
    if (!fileContent.includes('/**')) {
        throw new Error(commandName + ' has no jsdoc!')
    }

    let lines = fileContent.split('\n').map(line => line.trim())

    // remove code
    lines = lines.splice(lines.indexOf('/**') + 1, lines.indexOf('*/'))

    // remove empty lines in the top
    let idx = lines.indexOf(lines.find(line => line !== '*')) // first line with text
    lines = lines.splice(idx)

    // remove example
    if (lines.includes('* <example>')) {
        lines = [...lines.splice(0, lines.indexOf('* <example>')), ...lines.splice(lines.indexOf('* </example>') + 1)]
    }

    // only inclide the first paragraph
    if (lines.includes('*')) {
        lines = [...lines.splice(0, lines.indexOf('*'))]
    }

    // stop processing if js doc is empty
    if (lines.length === 0) {
        throw new Error(commandName + ' has an empty jsdoc!')
    }

    lines = ['/**', ...lines, ' */', '']

    lines = lines.map((line, idx) => {
        if (idx === 0) {
            return line
        }
        if (line.startsWith('*')) {
            line = ' ' + line
        }
        return ' '.repeat(indentation) + line
    })

    return lines.join('\n')
}

module.exports = {
    buildCommand,
    getJsDoc
}
