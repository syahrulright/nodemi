import validator from 'validator'
import ValidationDB from './ValidationDB.js'

const ValidationType = Object.freeze({
    required: "required",
    email: "email",
    match: "match",
    string: "string",
    float: "float",
    integer: "integer",
    max: "max",
    min: "min",
    date: "date",
    array: "array",
    exists: "exists",
    unique: "unique",
    mimetypes: "mimetypes",
    mimes: "mimes",
    maxfile: "maxfile",
    // digits_between: "digits_between", //1 - 2
})

const MessageType = Object.freeze({
    must: "must be",
    matchWith: "must be match with",
    is: "is",
    between: "between",
    validFormat: "must be valid format of",
    max: "should be less or equal than",
    min: "should be more or equal than",
    exists: "not recorded in database",
    unique: "already used",
    // digit: [
    //     "should be",
    //     "digit"
    // ]
})


class RequestValidation {

    errors = {}
    constructor(req) {
        this.body = req?.body ?? {}
    }

    async load(child) {
        this.rules = child.rules();
        // await this.check()
    }

    isError() {
        return !(JSON.stringify(this.errors) === JSON.stringify({}))
    }


    async check() {
        this.errors = {}
        console.log("--------------------------------------------------- field")
        console.log(this.body)
        console.log("--------------------------------------------------- rules")
        console.log(this.rules)
        console.log("=================================================== Checking")
        for (let ruleKey in this.rules) {
            if (this.#hasField(ruleKey)) {
                await this.#checking(ruleKey)
            }
            else {
                if (this.#ruleHasRuleRequired(ruleKey))
                    this.#setError(ruleKey, "required")
            }
        }
        return this.isError()
    }
    #ruleHasRuleRequired(ruleKey) {
        let validation = this.rules[ruleKey].validation
        for (let keyValidation of validation) {
            if (keyValidation == "required") {
                return true
            }
        }
        return false
    }

    #hasField(ruleKey) {
        for (let fieldKey in this.body) {
            if (ruleKey.toString() == fieldKey.toString()) {
                return true
            }
        }
        return false
    }
    #getField(key) {
        for (let fieldKey in this.body) {
            if (key.toString() == fieldKey.toString()) {
                return this.body[key]
            }
        }
        return null
    }


    /**
     * 
     * @param {*} ruleKey  ex: name, email, username
     * @param {*} validation  ex: required, exist, match
     * @param {*} options params of validation that has params. ex: match:password, return password
     */
    #setError(ruleKey, validation, options) {
        let message = this.#setErrorMessage(ruleKey, validation, options)
        if (Object.keys(this.errors).length === 0) {
            this.errors["errors"] = {}
        }
        if (!this.errors["errors"][ruleKey]) {
            this.errors["errors"][ruleKey] = []
        }
        this.errors["errors"][ruleKey].push(message)
    }



    /**
     * 
     * @param {*} ruleKey ex: name, username, birthdate
     * @param {*} validation ex: required, email, max,min
     * @param {*} options params of validation that has params. ex: match:password
     * @returns 
     */
    #setErrorMessage(ruleKey, validation, options) {
        // ---------- set custom message
        if (this.rules[ruleKey].message && this.rules[ruleKey].message[validation]) {
            return this.rules[ruleKey].message[validation]
        }
        // ---------- set default message
        let attribute = this.rules[ruleKey].attribute ?? ruleKey
        let messageType = this.#errorTypeCategories(validation)
        return this.#defaultErrorMessage(
            attribute,
            validation,
            messageType,
            validation,
            options
        )
    }

    /**
     * 
     * @param {*} val ex: ex: required, email, max,min
     * @returns MessageType  is category message. ex:  { matchWith: "must be match with"}
     */
    #errorTypeCategories(val) {
        if (val === ValidationType.email || val === ValidationType.date || val === ValidationType.float ||
            val === ValidationType.integer || val === ValidationType.array || val === ValidationType.mimetypes ||
            val === ValidationType.mimes)
            return MessageType.validFormat


        if (val === ValidationType.required)
            return MessageType.is
        if (val === ValidationType.match)
            return MessageType.matchWith
        if (val === ValidationType.max || val === ValidationType.maxfile)
            return MessageType.max
        if (val === ValidationType.min)
            return MessageType.min
        if (val === ValidationType.exists)
            return MessageType.exists
        if (val === ValidationType.unique)
            return MessageType.unique

        return MessageType.must
    }

    /**
     * 
     * @param {*} attribute ex: E-Mail
     * @param {*} validationType ex: mimetypes, required, exist
     * @param {*} messageType      MessageType  is category message. ex:  { matchWith: "must be match with"}
     * @param {*} validation ex: ex: required, email, max,min
     * @param {*} options params of the validation. ex: max:3, then options is "3"
     * @returns 
     */
    #defaultErrorMessage(attribute, validationType, messageType, validation, options) {
        attribute = attribute[0].toUpperCase() + attribute.slice(1);

        if (validationType === ValidationType.matchWith || validationType === ValidationType.max || validationType === ValidationType.min ||
            validationType === ValidationType.mimetypes || validationType === ValidationType.mimes
        ) {
            validation = options
        }

        if (validationType === ValidationType.maxfile) {
            validation = options.join(" ") // ["100","KB"] => "100 KB" 
        }

        console.log("options", options)


        if (validationType === ValidationType.exists || validationType === ValidationType.unique)
            return "The " + attribute + " " + messageType

        return "The " + attribute + " " + messageType + " " + validation
    }


    /**
     * 
     * @param {*} ruleKey  ex: password, id, name, 
     * @returns void
     */
    async  #checking(ruleKey) {
        var field = this.body[ruleKey]
        let validations = this.rules[ruleKey].validation // ["required","match:password","min:1","max:2"]
        console.log(">>>>--------------------------------------->>>>")
        console.log(validations)
        if (!Array.isArray(validations)) {
            console.log("\x1b[31m", "validations not an array", key, "\x1b[0m");
            return null;
        }

        for (let validation of validations) {
            // val, ex: float, required, date etc...
            console.log("--------------")
            console.log(validation, field)
            let options
            let validationName
            let hasParams = this.#isValidationHasParam(validation)
            let validationParams
            // ex: max:3, min:5    
            if (hasParams) {
                console.log("CREATE PARAMS")
                options = this.#createOptionsParams(ruleKey, validation)
                validationName = this.#getValidateNameFromValidationWithParams(validation)
            }
            else {
                validationName = validation
                console.log("not sCREATE PARAMS")
            }
            let isValid = await this.ValidationCheck(validationName, field, { options: options })

            if (!isValid) {
                console.log("ERROR")
                console.log(validationName)
                if (hasParams) {
                    validationParams = this.#getValidateParams(validation)
                    console.log("validationParams", validationParams)
                }
                this.#setError(ruleKey, validationName, validationParams)
            }

        }
        console.log("<<<<---------------------------------------<<<<")
    }


    /**
    * 
    * @param {*} validation ex: match:oldPassword
    * @returns 
    */
    #isValidationHasParam(validation) {
        if (validation.indexOf(":") !== -1) return true
        return false
    }


    /**
     * 
     * @param {*} validation ex: match:oldPassword
     * @returns match
     */
    #getValidateNameFromValidationWithParams(validation) {
        let arr = validation.split(":")
        return arr[0]
    }

    /**
     * 
     * @param {*} validation ex: digit_between:1,2
     * @returns [1,2]
     */
    #getValidateParams(validation) {
        let arr = validation.split(":")
        arr = arr.splice(1, 1);
        console.log("arr", arr)
        console.log("validation", validation)
        if (arr[0].indexOf(",") !== -1) {
            return arr[0].split(",")
        }
        return arr
    }

    /**
     * 
     * @param {*} validation ex: match:password, max:2, min:3
     * @param {*} field 
     */
    #createOptionsParams(ruleKey, validation) {

        let arr = validation.split(":")
        let options = {}
        try {
            if (arr.length > 1) {
                if (arr[0] === ValidationType.match) {
                    let fieldMatch = this.#getField(arr[1])
                    if (!fieldMatch)
                        throw "Not right format of validation: " + validation
                    options["fieldMatch"] = fieldMatch
                }
                if (arr[0] === ValidationType.max || arr[0] === ValidationType.min) {
                    let param = arr[1]
                    if (!param) throw "Not right format of validation: " + validation

                    if (arr[0] === ValidationType.max)
                        options["fieldMax"] = param
                    if (arr[0] === ValidationType.min)
                        options["fieldMin"] = param
                }
                if (arr[0] === ValidationType.exists) {
                    let params = arr[1].split(",")
                    if (params.length < 2) throw "Not right format of validation: " + validation


                    options["fieldTableName"] = params[0]
                    options["fieldColumnName"] = params[1]
                }
                if (arr[0] === ValidationType.unique) {
                    let params = arr[1].split(",")
                    if (params.length < 2) throw "Not right format of validation: " + validation


                    options["fieldTableName"] = params[0]
                    options["fieldColumnName"] = params[1]

                    if (params[2])
                        options["fieldException"] = params[2]

                }

                if (arr[0] === ValidationType.mimetypes || arr[0] === ValidationType.mimes) {
                    let params = arr[1].split(",")
                    options["fieldMimetypes"] = params
                }

                if (arr[0] === ValidationType.maxfile) {
                    let params = arr[1].split(",")
                    if (params.length < 1) throw "Not right format of validation: " + validation


                    if (!validator.isInt(params[0]) || !this.#isValidFileUnit(params[1]))
                        throw "Not right format of validation: " + validation + ". Valid maxfile:1000,MB -> [BG,MB,KB,Byte]"

                    options["fieldMaxSize"] = params[0]
                    options["fieldUnit"] = params[1]
                }

            }
            else {
                throw "Not right format of validation: " + validation
            }
        } catch (error) {
            console.log("\x1b[31m", error, "\x1b[0m");
        }

        return options

    }


    /**
     * 
     * @param {*} validation ex: required, float
     * @param {*} field 
     * @returns bolean
     */
    async ValidationCheck(validationName, field, { options }) {

        console.log("validationName...", validationName)
        console.log("field...", field)
        console.log("options...", options)

        //------------------------------------------------------ database
        if (validationName == ValidationType.exists) {
            let d = await ValidationDB.exists(options.fieldTableName, options.fieldColumnName, field)
            return d
        }
        if (validationName == ValidationType.unique) {
            return await ValidationDB.unique(options.fieldTableName, options.fieldColumnName, field,
                options.fieldException
            )
        }

        //------------------------------------------------------ has params

        if (validationName === ValidationType.maxfile) {

            if (!field)
                return true

            let size = this.#convertByteToAnyUnit(field.size, options.fieldUnit)
            return parseFloat(size) <= parseFloat(options.fieldMaxSize)
        }

        if (validationName === ValidationType.match)
            return validator.matches(field ?? " .", options?.fieldMatch ?? " ")

        if (validationName === ValidationType.max) {
            if (Array.isArray(field)) {
                return field.length <= options.fieldMax
            }
            return validator.isFloat(field.toString() ?? "0", { max: options.fieldMax ?? " " })
        }

        if (validationName === ValidationType.min) {
            if (Array.isArray(field)) {
                return field.length >= options.fieldMin
            }
            return validator.isFloat(field.toString() ?? "0", { min: options.fieldMin ?? " " })
        }

        if (validationName === ValidationType.mimetypes) {
            if (!Array.isArray(options.fieldMimetypes) || !field.type) {
                return false
            }
            return validator.isIn(field.type, options.fieldMimetypes)
        }

        if (validationName === ValidationType.mimes) {
            if (!Array.isArray(options.fieldMimetypes) || !field.extension) {
                return false
            }
            return validator.isIn(field.extension.split('.').join(""), options.fieldMimetypes)
        }


        //------------------------------------------------------ has no params

        if (validationName === ValidationType.required) {
            if (field === undefined || field === null || field === "")
                return false
        }

        if (validationName === ValidationType.email)
            return validator.isEmail(field.toString())

        if (validationName === ValidationType.float)
            return (typeof field === "number")
        if (validationName === ValidationType.integer)
            return validator.isInt(field.toString())

        if (validationName === ValidationType.date) {
            let newDate = this.#formatDate(field)
            return validator.isDate(newDate.toString())
        }

        if (validationName === ValidationType.string)
            return (typeof field === "string")

        if (validationName === ValidationType.array)
            return (Array.isArray(field))


        return true
    }

    #formatDate(date) {
        try {
            var d = new Date(date),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();

            if (month.length < 2)
                month = '0' + month;
            if (day.length < 2)
                day = '0' + day;
            return [year, month, day].join('/');
        } catch (error) {

        }
        return date
    }

    fileUnits = {
        GB: "GB", MB: "MB", KB: "KB", Byte: "Byte"
    }


    /**
     * check if unit input is valid
     * @param {*} unitFile 
     * @returns 
     */
    #isValidFileUnit(unitFile) {

        for (let unit in this.fileUnits) {
            if (unitFile == unit)
                return true
        }
        return false
    }

    #convertByteToAnyUnit(sizeInByte, unit) {

        console.log("convert...")
        console.log("unit", unit)
        console.log("this.filebytes", this.fileUnits.KB)
        if (unit === this.fileUnits.KB) {
            console.log("convert to KB FROM Bytes")
            return (sizeInByte / 1024).toFixed(2)
        }

        if (unit === this.fileUnits.MB)
            return (sizeInByte / 1048576).toFixed(2)

        if (unit === this.fileUnits.GB)
            return (sizeInByte / 1073741824).toFixed(2)

        return sizeInByte
    }

}

export default RequestValidation
