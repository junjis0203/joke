export const
    // stack operation
    PUSH = 'PUSH',
    POP = 'POP',
    DUP = 'DUP',

    // variable
    PUSH_SCOPE = 'PUSH_SCOPE',
    POP_SCOPE = 'POP_SCOPE',
    DEFINE_VARIABLE = 'DEFINE_VARIABLE',
    INITIALIZE_VARIABLE = 'INITIALIZE_VARIABLE',
    EXTRACT_PATTERN = 'EXTRACT_PATTERN',
    SET_VARIABLE = 'SET_VARIABLE',
    LOOKUP_VARIABLE = 'LOOKUP_VARIABLE',
    LOOKUP_THIS = 'LOOKUP_THIS',

    // operation
    UNI_OP = 'UNI_OP',
    BIN_OP = 'BIN_OP',

    // jump
    RETURN = 'RETURN',
    JUMP_IF = 'JUMP_IF',
    JUMP = 'JUMP',
    PUSH_BREAKABLE = 'PUSH_BREAKABLE',
    POP_BREAKABLE = 'POP_BREAKABLE',
    BREAK = 'BREAK',
    CONTINUE = 'CONTINUE',
    PUSH_TRY = 'PUSH_TRY',
    POP_TRY = 'POP_TRY',
    THROW = 'THROW',

    // call
    CALL = 'CALL',
    NEW = 'NEW',
    SUPER_CALL = 'SUPER_CALL',

    // function
    MAKE_FIUNCTION = 'MAKE_FIUNCTION',
    SET_SUPER_CLASS = 'SET_SUPER_CLASS',

    // object
    MAKE_OBJECT = 'MAKE_OBJECT',
    DEFINE_PROPERTY = 'DEFINE_PROPERTY',
    COPY_OBJECT = 'COPY_OBJECT',

    // array
    MAKE_ARRAY = 'MAKE_ARRAY',
    ADD_ELEMENT = 'ADD_ELEMENT',
    COPY_ARRAY = 'COPY_ARRAY',

    // property
    GET_PROPERTY = 'GET_PROPERTY',
    SET_PROPERTY = 'SET_PROPERTY',
    SUPER_PROPERTY = 'SUPER_PROPERTY'
;
