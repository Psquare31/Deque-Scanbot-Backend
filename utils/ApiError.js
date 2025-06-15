class ApiError extends Error {
    constructor(
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.data = null
        this.success = false
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

        // Extract file location and line number from stack trace
        const stackLines = this.stack.split('\n')
        // Skip the first line (Error message) and second line (constructor)
        // Get the third line which contains the actual error location
        const callerLine = stackLines[2]
        
        if (callerLine) {
            // Extract file path and line number using regex
            const match = callerLine.match(/at\s+(?:\w+\s+)?\(?(?:(?:file|http|https):\/\/)?([^:]+):(\d+):(\d+)\)?/)
            if (match) {
                this.errorLocation = {
                    file: match[1].split('/').pop(), // Get just the filename
                    line: parseInt(match[2]),
                    column: parseInt(match[3])
                }
            }
        }

        // Add timestamp
        this.timestamp = new Date().toISOString()
    }

    // Static method to create an ApiError with current location
    static create(statusCode, message, errors = []) {
        return new ApiError(statusCode, message, errors)
    }
}

export { ApiError } 