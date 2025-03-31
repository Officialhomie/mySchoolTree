import attendanceTrackingAbi from '../ABI/atttendancetracking.json'
import schoolManagementBaseAbi from '../ABI/schoolmanagementbase.json'
import studentManagementAbi from '../ABI/studentmanagement.json'
import schoolcertificate from '../ABI/schoolcertificate.json'
import programmanagement from '../ABI/programmanagement.json'
import myrolemanagement from '../ABI/myrolemanagement.json'
import studentprofile from '../ABI/studentprofile.json'
import tuitionsystem from '../ABI/tuitionsystem.json'
import revenueSystem from '../ABI/revenueSystem.json'
import schoolmanagementFactory from '../ABI/schoolmanagementFactory.json'


const myAttendaceABI = attendanceTrackingAbi
const mySchoolManagementBaseABI = schoolManagementBaseAbi
const myStudentManagementABI = studentManagementAbi
const mySchoolCertificateABI = schoolcertificate
const myProgramManagementABI = programmanagement
const myRoleManagementABI = myrolemanagement
const myStudentProfileABI = studentprofile
const myTuitionSystemABI = tuitionsystem
const myRevenueSystemABI = revenueSystem
const mySchoolManagementFactoryABI = schoolmanagementFactory


const myAttendaceContractAddress = '0x991eb294f51661bff40B16f7f023C387e98Fc813'
const mySchoolManagementBaseContractAddress = '0x7E12489EF73e9E5fE796DBd4a13CDB6cF5C9e574'
const myStudentManagementContractAddress = '0x6b3A2611444f075f4fe2099AbA9522491bE9BFab'
const mySchoolCertificateContractContractAddress = '0x25A0329865Fbf88A898E426eAb3497ff9c366a7D'
const myProgramManagementContractAddress = '0xA6B1bB9cfB8E577dC29555BfbfaC18a1221370e1'
const myRoleManagementContractAddress = '0x3B9Aa1234FC524067b4Acec961d848C4b1cF6634'
const myStudentProfileContractAddress = '0x5c431bc3f01dCd696aE1b784Ff260b233f29d518'
const myTuitionSystemContractAddress = '0x55637cc8eF38d164b6398E2729298209E047F946'
const myRevenueSystemContractAddress = '0x4bcF34f3d95EcAef131ba22Ae37BC4c6523654d2'
const mySchoolManagementFactoryContractAddress = '0xe6F9F2D225da1835B1b1B79B4c310F2C68cF2e61'


export const contractAttendanceTracking = { 
    abi: myAttendaceABI,
    address: myAttendaceContractAddress
}

export const contractSchoolManagementBase = {
    abi: mySchoolManagementBaseABI,
    address: mySchoolManagementBaseContractAddress
}

export const contractStudentManagement = {
    abi: myStudentManagementABI,
    address: myStudentManagementContractAddress
}

export const contractSchoolCertificate = {
    abi: mySchoolCertificateABI,
    address: mySchoolCertificateContractContractAddress
}

export const contractProgramManagement = {
    abi: myProgramManagementABI,
    address: myProgramManagementContractAddress
}

export const contractRoleManagement = {
    abi: myRoleManagementABI,
    address: myRoleManagementContractAddress
}

export const contractStudentProfile = {
    abi: myStudentProfileABI,
    address: myStudentProfileContractAddress
}

export const contractTuitionSystem = {
    abi: myTuitionSystemABI,
    address: myTuitionSystemContractAddress
}

export const contractRevenueSystem = {
    abi: myRevenueSystemABI,
    address: myRevenueSystemContractAddress
}

export const contractSchoolManagementFactory = {
    abi: mySchoolManagementFactoryABI,
    address: mySchoolManagementFactoryContractAddress
}








