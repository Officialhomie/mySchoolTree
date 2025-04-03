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


const myAttendaceContractAddress = '0xb0610af457d8a9f4d9b7e9e19f42e4ff0cb70109'
const mySchoolManagementBaseContractAddress = '0x25f6cfaa3643e813137f41475240f340f1a2a991'
const myStudentManagementContractAddress = '0x41ba9139b99b57a4f73d8c7f41f5cccff677d563'
const mySchoolCertificateContractContractAddress = '0x54153a4d0d0379c976bfe47f6c1e76dd6434d595'
const myProgramManagementContractAddress = '0x0489a2109a4bae17d11b584c6c8d4f92e93158af'
const myRoleManagementContractAddress = '0xf7cd3a74c37113516b60a516d0c657e8c03e51d7'
const myStudentProfileContractAddress = '0xee09eae82539866dbf4a7af45913e9fb816c949f'
const myTuitionSystemContractAddress = '0x94c7bcc591e6cf45537da11db0fe3046aab51c5d'
const myRevenueSystemContractAddress = '0xf733304763f32dd5be4cd6de0d49c1b5cac75788'
const mySchoolManagementFactoryContractAddress = '0xf94e2babc52c6a0362b947e1c2a246864687e797'


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








