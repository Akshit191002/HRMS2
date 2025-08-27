export enum AccountType{
    SAVING='Saving',
    CURRENT='Current'
}
export interface BankDetails{
    id?:string,
    bankName:string,
    accountName:string,
    branchName:string,
    accountType:AccountType,
    accountNum:string,
    ifscCode:string
}