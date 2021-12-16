export enum EPrimitiveType
{
    Number,
    String,
    Boolean
}

export enum CorePropertyTypes {
	Group = "group",
	Comment = "comment",
	/* Types */
	Number = "number",
	String = "string",
	Bool = "boolean",
	Vec3 = "vec3",
	/* Shapes */
	Sphere = "sphere",
	Capsule = "capsule",
	AABB = "aabb",
	OOBB = "oobb",
	Plane = "plane",
	Line = "line",
	Mesh = "mesh"
}

export interface ITypeLayout
{
    [nameId: string] : EPrimitiveType
}

export interface IType
{
    nameId: string;
    layout: ITypeLayout;
}

export function buildPrimitiveType(stringValue : string) : EPrimitiveType
{
    switch(stringValue)
    {
        case "string": return EPrimitiveType.String;
        case "number": return EPrimitiveType.Number;
        case "boolean": return EPrimitiveType.Boolean;
    }
}

export class TypeRegistry
{
    private static instance: TypeRegistry;
    public static getInstance(): TypeRegistry
    {
        if (!TypeRegistry.instance)
        {
            TypeRegistry.instance = new TypeRegistry();
        }

        return TypeRegistry.instance;
    }

    private types: Map<string, IType>;

    constructor()
    {
        this.types = new Map<string, IType>();
        this.registerDefaultTypes();
    }

    registerType(type : IType)
    {
        const existingType = this.types.get(type.nameId);
        // TODO: Assert/Error
        if (!existingType)
        {
            this.types.set(type.nameId, type);
        }
    }

    findType(nameId : string)
    {
        return this.types.get(nameId);
    }

    private registerDefaultTypes()
    {
        // TODO: Read these from a configuration file
        // TODO: Add a type editor within the tool
        const vec3 : IType = {
            nameId: "vec3",
            layout: {
                x: EPrimitiveType.Number,
                y: EPrimitiveType.Number,
                z: EPrimitiveType.Number
            }
        };
        this.registerType(vec3);
    }
}