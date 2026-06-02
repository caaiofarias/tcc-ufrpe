export type ClaimName = 'name' | 'cpf' | 'course' | 'graduationDate' | 'gpa' | 'registryNumber' | 'university_name'



export type Claim = {
    name: ClaimName;
    value: string;
}