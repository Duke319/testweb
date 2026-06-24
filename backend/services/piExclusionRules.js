const PI_AVERAGE_EXCLUSION_REASON = "不计入计算";

const PI_EXCLUDED_EMPLOYEES = [
  { employeeNo: "88153019", names: ["刘斌"] },
  { employeeNo: "88153359", names: ["来宋江"] },
  { employeeNo: "88152751", names: ["方建"] },
  { employeeNo: "88154660", names: ["鲁梦云", "鲁孟云"] },
  { employeeNo: "88156089", names: ["郑平"] },
  { employeeNo: "88156828", names: ["杜业波"] },
  { employeeNo: "88334388", names: ["杨振国"] },
  { employeeNo: "", names: ["邱国亮"] },
  { employeeNo: "88161732", names: ["刘卫兵"] },
  { employeeNo: "88161821", names: ["王一志"] },
  { employeeNo: "88165319", names: ["刘涛"] },
  { employeeNo: "88165532", names: ["郑余忠"] },
];

const PI_EXCLUDED_EMPLOYEE_NOS = new Set(
  PI_EXCLUDED_EMPLOYEES.map((employee) => normalizeEmployeeNo(employee.employeeNo)).filter(Boolean)
);
const PI_EXCLUDED_EMPLOYEE_NAMES = new Set(
  PI_EXCLUDED_EMPLOYEES.flatMap((employee) => employee.names).map(normalizeEmployeeName).filter(Boolean)
);

function normalizeEmployeeNo(value) {
  return String(value || "").trim();
}

function normalizeEmployeeName(value) {
  return String(value || "")
    .trim()
    .replace(/^(Mr\.|Ms\.)\s*/i, "")
    .split("/")[0]
    .trim();
}

function isPiExcludedEmployee(record = {}, fallbackName = "") {
  const employeeNo = normalizeEmployeeNo(record.employeeNo || record.employee_no || record.operatorNo || record.operator_no);
  const employeeName = normalizeEmployeeName(
    fallbackName || record.employeeName || record.employee_name || record.sourceName || record.operatorName || record.operator_name
  );
  return PI_EXCLUDED_EMPLOYEE_NOS.has(employeeNo) || PI_EXCLUDED_EMPLOYEE_NAMES.has(employeeName);
}

function piExclusionReasonFor(record = {}, fallbackName = "") {
  return isPiExcludedEmployee(record, fallbackName) ? PI_AVERAGE_EXCLUSION_REASON : "";
}

module.exports = {
  PI_AVERAGE_EXCLUDED_EMPLOYEE_NAMES: PI_EXCLUDED_EMPLOYEE_NAMES,
  PI_AVERAGE_EXCLUDED_EMPLOYEE_NOS: PI_EXCLUDED_EMPLOYEE_NOS,
  PI_AVERAGE_EXCLUSION_REASON,
  PI_EXCLUDED_EMPLOYEES,
  isPiExcludedEmployee,
  normalizeEmployeeName,
  normalizeEmployeeNo,
  piExclusionReasonFor,
};
