
document.addEventListener("DOMContentLoaded", () => {
  
  
function showError(id, msg) {
  if(id){
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = "block";
  }
  
}

function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = "";
  el.style.display = "none";
}

// Login
function handleLogin(e) {
  e.preventDefault();
  clearError("login-message");
  const form = document.querySelector('.signin-form');
  const username = form.username.value.trim();
  const cnic = form.cnic_number.value.trim();
  const password = form.password.value.trim();
  if (username === '' || cnic === '' || password === '') {
    showError('signin-form', 'All fields are required.');
    form.username.classList.add('error');
    form.cnic.classList.add('error');
    form.password.classList.add('error');
    return false;
  }

  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  if (!cnicRegex.test(cnic)) {
    showError('signin-form', 'CNIC must follow format: 12345-1234567-1');
    form.cnic.classList.add('error');
    return false;
  }
  
  
    
  fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ cnic, password }) 
  })
    .then(res => res.json())
    .then(data => {
      
        console.log("1RECIEVING student data:", data);
      if (data.success) {
        // console.dir(data)
        const formC = document.querySelector('.flip-card-front')
        formC.innerHTML= `<div class="svg-cnt">
        <img src="/assets/images/success.svg"  alt="">
        <p class="short-msg">Sign in successful. Redirecting to panel...</p>
        </div>`
        setTimeout(() => {
          window.open('/dashboard', '_blank') // secure redirect
        }, 2000);
      } else {
        console.log("RECIEVING student data:", data);
        showError("login-message", data.message)
      }
    })
    .catch(() => {
      showError("login-message", "Something went wrong.")
    });
}






const cnicInput = document.querySelectorAll('input[name="cnic_number"]');
const mobnoInput = document.querySelector('input[name="mobile_no"]');
const signup = document.querySelector('.signup-form');
const signin = document.querySelector('.signin-form');

  mobnoInput.addEventListener("input", () => {
    let value = mobnoInput.value.replace(/\D/g, ""); // remove non-digits
    console.log(value, value.length)
    if (value.length > 10){
      value = value.slice(0, 10);
    } 
    mobnoInput.value = value;
  });

  cnicInput.forEach((input)=>{
    input.addEventListener("input", () => {
    let value = input.value.replace(/\D/g, ""); // remove non-digits
    if (value.length > 13) value = value.slice(0, 13);
    let formatted = value;
    if (value.length > 5) formatted = value.slice(0, 5) + '-' + value.slice(5);
    if (value.length > 12) formatted = formatted.slice(0, 13) + '-' + value.slice(12);
    input.value = formatted;
  });
  })
  
signup.addEventListener("submit", validateSignUp)
signin.addEventListener("submit", handleLogin)
const inputs = document.querySelectorAll('.signup-form input');

inputs.forEach(input => {
input.addEventListener('input', function (e) {
  inputs.forEach(input => input.classList.remove('error'));
  clearError("signup-message");
  // You can add custom logic here, e.g., remove error message on typing
});
});
function validateSignUp(event) {
  event.preventDefault();
  clearError("signup-message");
 
  const form = document.querySelector('.signup-form');
  const {
    roll_no, student_name, father_name, department, program,
    cnic_number, mobile_no, institute,
    password, ['confirm-password']: confirmPassword
  } = form;

  const inputs = [roll_no, student_name, father_name, department, program, cnic_number, mobile_no, institute, password, confirmPassword];
  // Check all required fields
  if ([...inputs].some(input => !input.value.trim())) {
  showError('signup-message', 'All fields are required.');
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
    } else {
      input.classList.remove('error'); // Optional
    }
  });

  return false;
}

  // CNIC Format Check
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  if (!cnicRegex.test(cnic_number.value)) {
    showError('signup-message', 'Invalid CNIC format. Use 12345-1234567-1');
    cnic_number.classList.add('error');
    return false;
  }

  // Password validation
  if (password.value.length < 6) {
    showError('signup-message', 'Password must be at least 6 characters.');
    password.classList.add('error');
    return false;
  }

  if (password.value !== confirmPassword.value) {
    showError('signup-message', 'Passwords do not match.');
    confirmPassword.classList.add('error');
    return false;
  }

  
  const data = {
      roll_no: roll_no.value,
      student_name: student_name.value,
      father_name: father_name.value,
      department: department.value,
      program: program.value,
      cnic_number: cnic_number.value,
      mobile_no: mobile_no.value,
      institute: institute.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    };

    fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const formC = document.querySelector('.flip-card-back');
        formC.innerHTML = `
          <div class="svg-cnt">
            <img src="/assets/images/success.svg" alt="">
            <p class="short-msg">You've Signed up successfully!<br>
            Now login using same credentials. <a onclick="flipCard(0)" class="a">Sign In</a></p>
          </div>`;
        setTimeout(showLogin, 1000);
      } else {
        document.getElementById("signup-message").style.color = "red";
        document.getElementById("signup-message").textContent = data.message;
      }
    })
    .catch(() => {
      document.getElementById("signup-message").style.color = "red";
      document.getElementById("signup-message").textContent = "Signup failed.";
    });
  return true;
}

const adminForm = document.querySelector(".admin-form");
adminForm.addEventListener("submit", validateAdmin);

function validateAdmin(e) {
  e.preventDefault(); 
  clearError("admin-message");

  const form = document.querySelector('.admin-form');
  const staffid = form.staffid.value.trim();
  const password = form.password.value.trim();

  if (!staffid || !password) {
    showError('admin-message', 'Staff ID and password are required.');
    form.staffid.classList.add('error');
    form.password.classList.add('error');
    return false;
  }

  // Send login request to backend
  fetch('/admin-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ staffid, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const formC = document.querySelector('.flip-card-admin');
      formC.innerHTML = `
        <div class="svg-cnt">
          <img src="/assets/images/success.svg" alt="">
          <p class="short-msg">Admin verified. Redirecting to admin panel...</p>
        </div>
      `;

      // Open admin dashboard in a new tab
      setTimeout(() => {
        window.open('/staffDashboard', '_blank');
      }, 2000);
    } else {
      showError('admin-message', data.message || "Login failed.");
    }
  })
  .catch(() => {
    showError('admin-message', "Server error during login.");
  });

  return true;
}





function showRecords() {
  
  fetchRecords();
}



function fetchRecords() {
  fetch('/records')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#records-table tbody');
      tbody.innerHTML = ''; // Clear old data

      data.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input value="${user.username}" data-original="${user.username}" disabled /></td>
          <td><input value="${user.roll_no || ''}" /></td>
          <td><input value="${user.student_name || ''}" /></td>
          <td><input value="${user.department || ''}" /></td>
          <td><input value="${user.program || ''}" /></td>
          <td>
            <button onclick="updateRecord(this)">Save</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    });
}

function updateRecord(button) {
  const row = button.closest('tr');
  const inputs = row.querySelectorAll('input');
  const [usernameEl, rollEl, nameEl, deptEl, progEl] = inputs;
  const username = usernameEl.dataset.original;

  const updates = {
    roll_no: rollEl.value,
    student_name: nameEl.value,
    department: deptEl.value,
    program: progEl.value
  };

  for (const key in updates) {
    fetch('/update-profile', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, key, value: updates[key] })
    });
  }
  alert("Record updated.");
}

function addNewRecordRow() {
  const tbody = document.querySelector('#records-table tbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input placeholder="New username" /></td>
    <td><input placeholder="Roll No" /></td>
    <td><input placeholder="Name" /></td>
    <td><input placeholder="Department" /></td>
    <td><input placeholder="Program" /></td>
    <td>
      <button onclick="createNewRecord(this)">Add</button>
    </td>
  `;
  tbody.appendChild(row);
}

function createNewRecord(button) {
  const row = button.closest('tr');
  const inputs = row.querySelectorAll('input');
  const [username, roll_no, student_name, department, program] = [...inputs].map(i => i.value);

  fetch('/add-record', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username, roll_no, student_name, department, program })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert("Record added!");
      fetchRecords();
    } else {
      alert("Error: " + data.message);
    }
  });
}


})
