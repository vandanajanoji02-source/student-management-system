const STORAGE_KEY = 'campus-student-records';
let students = loadStudents();
let editingId = null;

const form = document.querySelector('#studentForm');
const tableBody = document.querySelector('#studentTableBody');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const departmentFilter = document.querySelector('#departmentFilter');
const toast = bootstrap.Toast.getOrCreateInstance(document.querySelector('#appToast'), { delay: 2600 });

function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function getInitials(name) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[character]));
}

function showToast(message) {
  document.querySelector('#toastMessage').textContent = message;
  toast.show();
}

function renderDepartments() {
  const currentDepartment = departmentFilter.value;
  const departments = [...new Set(students.map((student) => student.course))]
    .sort((first, second) => first.localeCompare(second));

  departmentFilter.innerHTML = '<option value="">All departments</option>' + departments
    .map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`)
    .join('');

  departmentFilter.value = departments.some(
    (department) => department.toLowerCase() === currentDepartment.toLowerCase()
  ) ? currentDepartment : '';
}

function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedDepartment = departmentFilter.value.toLowerCase();
  const filteredStudents = students.filter((student) => {
    const searchableText = `${student.name} ${student.studentId} ${student.course} ${student.email}`.toLowerCase();
    const matchesSearch = searchableText.includes(query);
    const matchesDepartment = !selectedDepartment || student.course.toLowerCase() === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  tableBody.innerHTML = filteredStudents.map((student) => `
    <tr>
      <td><div class="student-person"><span class="avatar">${getInitials(student.name)}</span><div><div class="student-name">${escapeHtml(student.name)}</div><div class="student-email">${escapeHtml(student.email)}</div></div></div></td>
      <td class="student-id">${escapeHtml(student.studentId)}</td>
      <td>${escapeHtml(student.course)}</td>
      <td>${escapeHtml(student.year)}</td>
      <td><span class="status-pill">Active</span></td>
      <td class="text-end">
        <button class="action-btn" data-action="edit" data-id="${student.id}" title="Edit ${escapeHtml(student.name)}" aria-label="Edit ${escapeHtml(student.name)}"><i class="bi bi-pencil-square"></i></button>
        <button class="action-btn delete" data-action="delete" data-id="${student.id}" title="Delete ${escapeHtml(student.name)}" aria-label="Delete ${escapeHtml(student.name)}"><i class="bi bi-trash3"></i></button>
      </td>
    </tr>`).join('');

  emptyState.hidden = filteredStudents.length !== 0;
  document.querySelector('#emptyTitle').textContent = students.length && !filteredStudents.length ? 'No matching students' : 'Your directory is ready';
  document.querySelector('#emptyMessage').textContent = students.length && !filteredStudents.length ? 'Try a different name, ID, course, or department.' : 'Add your first student to start building the campus directory.';
  document.querySelector('#recordCount').textContent = filteredStudents.length;
  document.querySelector('#totalStudents').textContent = students.length;
  document.querySelector('#activeStudents').textContent = students.length;
  document.querySelector('#departmentCount').textContent = new Set(students.map((student) => student.course.toLowerCase())).size;
  renderDepartments();
}

function resetForm() {
  editingId = null;
  form.reset();
  form.classList.remove('was-validated');
  form.elements.studentId.setCustomValidity('');
  document.querySelector('#formMode').textContent = 'New record';
  document.querySelector('#formTitle').textContent = 'Add a student';
  document.querySelector('#submitButton').innerHTML = '<i class="bi bi-plus-lg"></i> Add student';
}

function editStudent(id) {
  const student = students.find((item) => item.id === id);
  if (!student) return;

  editingId = id;
  Object.entries(student).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
  document.querySelector('#formMode').textContent = 'Editing record';
  document.querySelector('#formTitle').textContent = 'Update student';
  document.querySelector('#submitButton').innerHTML = '<i class="bi bi-check-lg"></i> Save changes';
  document.querySelector('#student-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const studentIdField = form.elements.studentId;
  const duplicateId = students.some((student) => (
    student.studentId.toLowerCase() === studentIdField.value.trim().toLowerCase() && student.id !== editingId
  ));

  studentIdField.setCustomValidity(duplicateId ? 'This student ID is already in use.' : '');
  if (!form.checkValidity()) {
    event.stopPropagation();
    form.classList.add('was-validated');
    return;
  }

  const studentData = Object.fromEntries(new FormData(form).entries());
  if (editingId) {
    students = students.map((student) => student.id === editingId ? { ...student, ...studentData } : student);
    showToast('Student record updated.');
  } else {
    students.unshift({ id: crypto.randomUUID(), ...studentData });
    showToast('Student added to the directory.');
  }

  saveStudents();
  resetForm();
  renderStudents();
});

tableBody.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  const student = students.find((item) => item.id === actionButton.dataset.id);
  if (actionButton.dataset.action === 'edit') editStudent(actionButton.dataset.id);
  if (actionButton.dataset.action === 'delete' && student && window.confirm(`Delete ${student.name}'s record?`)) {
    students = students.filter((item) => item.id !== actionButton.dataset.id);
    saveStudents();
    renderStudents();
    showToast('Student record deleted.');
  }
});

searchInput.addEventListener('input', renderStudents);
departmentFilter.addEventListener('change', renderStudents);
document.querySelector('#resetButton').addEventListener('click', resetForm);
document.querySelector('#focusAddButton').addEventListener('click', () => {
  resetForm();
  document.querySelector('#student-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#studentName').focus();
});
document.querySelector('#emptyAddButton').addEventListener('click', () => document.querySelector('#focusAddButton').click());
form.elements.studentId.addEventListener('input', () => form.elements.studentId.setCustomValidity(''));

renderStudents();