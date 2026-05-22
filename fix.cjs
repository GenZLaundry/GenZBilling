const fs = require('fs');

const advanceLines = [
  { line: 61, text: "      showAlert({ message: 'Failed to load advances', type: 'error' });" },
  { line: 90, text: "        showAlert({ message: 'Advance record created successfully!', type: 'success' });" },
  { line: 95, text: "        showAlert({ message: 'Failed to create record: ' + response.message, type: 'error' });" },
  { line: 99, text: "      showAlert({ message: 'Failed to create record (check console)', type: 'error' });" },
  { line: 119, text: "        showAlert({ message: 'History added successfully!', type: 'success' });" },
  { line: 130, text: "        showAlert({ message: 'Failed to update: ' + response.message, type: 'error' });" },
  { line: 134, text: "      showAlert({ message: 'Failed to update record (check console)', type: 'error' });" },
  { line: 145, text: "            showAlert({ message: 'Record deleted successfully!', type: 'success' });" },
  { line: 148, text: "            showAlert({ message: 'Failed to delete: ' + response.message, type: 'error' });" },
  { line: 152, text: "          showAlert({ message: 'Failed to delete record', type: 'error' });" }
];

let advContent = fs.readFileSync('AdvanceManager.tsx', 'utf8').split('\n');
advanceLines.forEach(l => {
  advContent[l.line - 1] = l.text;
});
fs.writeFileSync('AdvanceManager.tsx', advContent.join('\n'));

const incomeLines = [
  { line: 40, text: "      showAlert({ message: 'Failed to load incomes', type: 'error' });" },
  { line: 72, text: "        showAlert({ message: editingIncome ? 'Income updated successfully!' : 'Income logged successfully!', type: 'success' });" },
  { line: 77, text: "        showAlert({ message: 'Failed to save record: ' + response.message, type: 'error' });" },
  { line: 81, text: "      showAlert({ message: 'Failed to save record (check console)', type: 'error' });" },
  { line: 103, text: "            showAlert({ message: 'Record deleted successfully!', type: 'success' });" },
  { line: 106, text: "            showAlert({ message: 'Failed to delete: ' + response.message, type: 'error' });" },
  { line: 110, text: "          showAlert({ message: 'Failed to delete record', type: 'error' });" }
];

let incContent = fs.readFileSync('IncomeManager.tsx', 'utf8').split('\n');
incomeLines.forEach(l => {
  incContent[l.line - 1] = l.text;
});
fs.writeFileSync('IncomeManager.tsx', incContent.join('\n'));

console.log('Fixed all files');
