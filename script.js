// scripts.js
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let placements = JSON.parse(localStorage.getItem('placements')) || [];
let applications = JSON.parse(localStorage.getItem('applications')) || [];
let currentEditingPlacementId = null;

// Chart instances
let branchChart = null;
let monthlyChart = null;
let placementStatsChart = null;
let packageDistributionChart = null;
let companyPerformanceChart = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const adminDashboard = document.getElementById('admin-dashboard');
const studentDashboard = document.getElementById('student-dashboard');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard(currentUser.role);
    }
});

// Initialize application data
function initializeApp() {
    // Add sample data if none exists
    if (users.length === 0) {
        users = [
            { id: 1, name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
            { id: 2, name: 'Student User', email: 'student@example.com', password: 'student123', role: 'student', branch: 'cs', studentId: 'CS2023001', cgpa: 8.7, phone: '+91 9876543210', address: '123 College Street, City, State' }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Only initialize placements if they don't exist or are empty
    if (placements.length === 0) {
        const samplePlacements = [
            { 
                id: 1, 
                company: 'Tech Solutions Inc.', 
                position: 'Software Engineer', 
                package: 12.5, 
                eligibility: 'CGPA >= 7.5, No backlogs', 
                description: 'We are looking for a skilled software engineer to join our dynamic team.', 
                deadline: getFutureDate(30), // 30 days from now
                branches: ['cs', 'it'], 
                status: 'active' 
            },
            { 
                id: 2, 
                company: 'Data Systems Ltd.', 
                position: 'Data Analyst', 
                package: 9.8, 
                eligibility: 'CGPA >= 7.0, Strong analytical skills', 
                description: 'Join our data team to help transform raw data into actionable insights.', 
                deadline: getFutureDate(45), // 45 days from now
                branches: ['cs', 'it', 'ece'], 
                status: 'active' 
            },
            { 
                id: 3, 
                company: 'Innovate Tech', 
                position: 'Frontend Developer', 
                package: 10.2, 
                eligibility: 'CGPA >= 7.0, Knowledge of React/Angular', 
                description: 'Create beautiful and responsive user interfaces for our web applications.', 
                deadline: getFutureDate(25), // 25 days from now
                branches: ['cs', 'it'], 
                status: 'active' 
            }
        ];
        
        placements = samplePlacements;
        localStorage.setItem('placements', JSON.stringify(placements));
    }
    
    if (applications.length === 0) {
        applications = [
            { id: 1, studentId: 2, placementId: 1, company: 'Tech Solutions Inc.', position: 'Software Engineer', appliedDate: getPastDate(5), status: 'pending', coverLetter: 'I am very interested in this position and believe my skills align well with your requirements.' },
            { id: 2, studentId: 2, placementId: 2, company: 'Data Systems Ltd.', position: 'Data Analyst', appliedDate: getPastDate(2), status: 'approved', coverLetter: 'My background in data analysis makes me a strong candidate for this role.' }
        ];
        localStorage.setItem('applications', JSON.stringify(applications));
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Render initial data
    renderPlacements();
    renderStudents();
    renderApplications();
    renderStudentApplications();
    renderUpcomingPlacements();
    renderAvailablePlacements();
    
    // Initialize charts when dashboard is shown
    setTimeout(initializeCharts, 100);
}

// Helper function to get future date
function getFutureDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

// Helper function to get past date
function getPastDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

// Setup all event listeners
function setupEventListeners() {
    // Auth tabs
    document.getElementById('login-tab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('register-tab').addEventListener('click', () => switchAuthTab('register'));
    
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Role change in register form
    document.getElementById('register-role').addEventListener('change', function() {
        const isAdmin = this.value === 'admin';
        document.getElementById('admin-code-group').style.display = isAdmin ? 'block' : 'none';
        document.getElementById('student-branch-group').style.display = isAdmin ? 'none' : 'block';
    });
    
    // Logout buttons
    document.getElementById('admin-logout').addEventListener('click', handleLogout);
    document.getElementById('student-logout').addEventListener('click', handleLogout);
    
    // Dashboard navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            
            // Update active menu item
            const parentMenu = this.closest('.sidebar-menu');
            parentMenu.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            const parent = this.closest('.dashboard-container').querySelector('.main-content');
            parent.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(target).classList.add('active');
            
            // Refresh data if needed
            if (target === 'overview') {
                updateAdminOverview();
                updateAnalyticsCards();
            } else if (target === 'available-placements') {
                renderAvailablePlacements();
            } else if (target === 'reports') {
                generateReport();
            } else if (target === 'student-overview') {
                renderStudentData();
            }
        });
    });
    
    // Admin buttons
    document.getElementById('add-placement-btn').addEventListener('click', () => showAddPlacementModal());
    document.getElementById('add-student-btn').addEventListener('click', () => showModal('add-student-modal'));
    document.getElementById('download-students').addEventListener('click', downloadStudentList);
    document.getElementById('generate-report').addEventListener('click', generateReport);
    document.getElementById('download-pdf').addEventListener('click', downloadPDF);
    
    // Student buttons
    document.getElementById('edit-profile-btn').addEventListener('click', () => showEditProfileModal());
    
    // Forms
    document.getElementById('placement-form').addEventListener('submit', handleAddOrEditPlacement);
    document.getElementById('student-form').addEventListener('submit', handleAddStudent);
    document.getElementById('edit-student-form').addEventListener('submit', handleEditStudent);
    document.getElementById('edit-profile-form').addEventListener('submit', handleEditProfile);
    document.getElementById('apply-form').addEventListener('submit', handleApplyForPlacement);
    
    // Branch filter
    document.getElementById('branch-filter').addEventListener('change', renderStudents);
    
    // Year filter
    document.getElementById('report-year').addEventListener('change', generateReport);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
            resetPlacementForm();
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
                resetPlacementForm();
            }
        });
    });
}

// Generate comprehensive dummy analytics data
function generateDummyAnalyticsData() {
    // Current year for realistic data
    const currentYear = new Date().getFullYear();
    
    return {
        // Branch distribution - total students by branch
        branchDistribution: [185, 142, 98, 76, 45], // CS, IT, ECE, ME, CE
        
        // Monthly applications for current year
        monthlyApplications: [45, 52, 68, 74, 82, 95, 110, 125, 140, 130, 115, 98],
        
        // Monthly placements for current year
        monthlyPlacements: [12, 18, 25, 32, 45, 52, 48, 55, 62, 58, 45, 38],
        
        // Branch-wise statistics
        branchApplications: [320, 245, 180, 120, 85], // Applications per branch
        branchOffers: [85, 62, 45, 28, 18], // Offers per branch
        placementRates: [73, 68, 60, 52, 45], // Placement rate percentage per branch
        
        // Package distribution
        packageDistribution: [45, 125, 95, 60, 25], // <5L, 5-10L, 10-15L, 15-20L, >20L
        
        // Company performance data
        companyPerformance: [
            { company: 'Tech Solutions Inc.', offers: 28, avgPackage: 14.2, highestPackage: 22.5 },
            { company: 'Data Systems Ltd.', offers: 22, avgPackage: 12.8, highestPackage: 18.7 },
            { company: 'Innovate Tech', offers: 18, avgPackage: 11.5, highestPackage: 16.3 },
            { company: 'Global Soft', offers: 15, avgPackage: 13.1, highestPackage: 19.2 },
            { company: 'Cloud Networks', offers: 12, avgPackage: 10.8, highestPackage: 15.6 },
            { company: 'AI Innovations', offers: 10, avgPackage: 16.3, highestPackage: 24.1 },
            { company: 'Digital Systems', offers: 8, avgPackage: 9.5, highestPackage: 13.8 },
            { company: 'Web Services Co.', offers: 7, avgPackage: 8.9, highestPackage: 12.4 }
        ],
        
        // Additional analytics data
        yearOverYearGrowth: 15.7, // Percentage
        averagePackage: 12.4, // LPA
        highestPackage: 24.1, // LPA
        totalPlacements: 325,
        placementRate: 68.5, // Percentage
        totalStudents: 546
    };
}

// Initialize charts with dummy data
function initializeCharts() {
    // Destroy existing charts if they exist
    if (branchChart) branchChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
    if (placementStatsChart) placementStatsChart.destroy();
    if (packageDistributionChart) packageDistributionChart.destroy();
    if (companyPerformanceChart) companyPerformanceChart.destroy();
    
    // Generate dummy data for analytics
    const dummyData = generateDummyAnalyticsData();
    
    // Initialize branch chart
    const branchCtx = document.getElementById('branch-chart');
    if (branchCtx) {
        branchChart = new Chart(branchCtx, {
            type: 'pie',
            data: {
                labels: ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering'],
                datasets: [{
                    data: dummyData.branchDistribution,
                    backgroundColor: [
                        '#4361ee',
                        '#7209b7',
                        '#f72585',
                        '#4cc9f0',
                        '#f8961e'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} students (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Initialize monthly applications chart
    const monthlyCtx = document.getElementById('monthly-chart');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Applications',
                    data: dummyData.monthlyApplications,
                    backgroundColor: '#4361ee',
                    borderWidth: 0,
                    borderRadius: 5
                }, {
                    label: 'Placements',
                    data: dummyData.monthlyPlacements,
                    backgroundColor: '#4cc9f0',
                    borderWidth: 0,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Initialize reports charts
    initializeReportsCharts();
}

// Initialize reports charts with dummy data
function initializeReportsCharts() {
    const dummyData = generateDummyAnalyticsData();
    
    // Placement Stats Chart
    const placementStatsCtx = document.getElementById('placement-stats-chart');
    if (placementStatsCtx) {
        placementStatsChart = new Chart(placementStatsCtx, {
            type: 'bar',
            data: {
                labels: ['CS', 'IT', 'ECE', 'ME', 'CE'],
                datasets: [
                    {
                        label: 'Offers',
                        data: dummyData.branchOffers,
                        backgroundColor: '#4361ee',
                        borderRadius: 5
                    },
                    {
                        label: 'Applications',
                        data: dummyData.branchApplications,
                        backgroundColor: '#7209b7',
                        borderRadius: 5
                    },
                    {
                        label: 'Placement Rate %',
                        data: dummyData.placementRates,
                        type: 'line',
                        borderColor: '#f72585',
                        backgroundColor: 'rgba(247, 37, 133, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#f72585',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Placement Rate (%)'
                        },
                        max: 100
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Package Distribution Chart
    const packageDistributionCtx = document.getElementById('package-distribution-chart');
    if (packageDistributionCtx) {
        packageDistributionChart = new Chart(packageDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['< 5 LPA', '5-10 LPA', '10-15 LPA', '15-20 LPA', '> 20 LPA'],
                datasets: [{
                    data: dummyData.packageDistribution,
                    backgroundColor: [
                        '#f72585',
                        '#4361ee',
                        '#7209b7',
                        '#4cc9f0',
                        '#f8961e'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} students (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    // Company Performance Chart
    const companyPerformanceCtx = document.getElementById('company-performance-chart');
    if (companyPerformanceCtx) {
        companyPerformanceChart = new Chart(companyPerformanceCtx, {
            type: 'bar',
            data: {
                labels: dummyData.companyPerformance.map(company => company.company),
                datasets: [
                    {
                        label: 'Number of Offers',
                        data: dummyData.companyPerformance.map(company => company.offers),
                        backgroundColor: '#4361ee',
                        borderRadius: 5,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Avg Package (LPA)',
                        data: dummyData.companyPerformance.map(company => company.avgPackage),
                        type: 'line',
                        borderColor: '#f72585',
                        backgroundColor: 'rgba(247, 37, 133, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#f72585',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Number of Offers'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Package (LPA)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const company = dummyData.companyPerformance[index];
                                return [
                                    `Highest Package: ₹${company.highestPackage} LPA`,
                                    `Average Package: ₹${company.avgPackage} LPA`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
}

// Update analytics cards with dummy data
function updateAnalyticsCards() {
    const dummyData = generateDummyAnalyticsData();
    
    // Update overview cards
    const cards = [
        { id: 'total-placements-card', value: dummyData.totalPlacements, change: `+${dummyData.yearOverYearGrowth}% from last year` },
        { id: 'avg-package-card', value: `₹${dummyData.averagePackage} LPA`, change: '+8.2% from last year' },
        { id: 'placement-rate-card', value: `${dummyData.placementRate}%`, change: '+5.3% from last year' },
        { id: 'highest-package-card', value: `₹${dummyData.highestPackage} LPA`, change: 'New record this year!' }
    ];
    
    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            const valueElement = element.querySelector('.analytics-value');
            const changeElement = element.querySelector('.analytics-change');
            
            if (valueElement) valueElement.textContent = card.value;
            if (changeElement) changeElement.textContent = card.change;
        }
    });
}

// Generate report with dummy data
function generateReport() {
    const year = document.getElementById('report-year').value;
    const dummyData = generateDummyAnalyticsData();
    
    // Update analytics cards in reports section
    document.getElementById('placement-rate').textContent = `${dummyData.placementRate}%`;
    document.getElementById('avg-package').textContent = `₹${dummyData.averagePackage} LPA`;
    document.getElementById('highest-package').textContent = `₹${dummyData.highestPackage} LPA`;
    document.getElementById('companies-visited').textContent = dummyData.companyPerformance.length;
    
    // Update change indicators
    document.getElementById('placement-rate-change').textContent = '+5% from last year';
    document.getElementById('avg-package-change').textContent = '+12% from last year';
    document.getElementById('highest-package-change').textContent = '+20% from last year';
    document.getElementById('companies-visited-change').textContent = '+8 from last year';
    
    // Update report table
    const tbody = document.querySelector('.report-table tbody');
    tbody.innerHTML = '';
    
    dummyData.companyPerformance.forEach(company => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${company.company}</td>
            <td>All Branches</td>
            <td>${company.offers}</td>
            <td>₹${company.avgPackage} LPA</td>
            <td>₹${company.highestPackage} LPA</td>
        `;
        tbody.appendChild(row);
    });
    
    // Reinitialize charts for the selected year
    updateReportCharts(year);
}

// Update report charts based on selected year
function updateReportCharts(year) {
    const dummyData = generateDummyAnalyticsData();
    
    // You can modify data based on year selection here
    const yearMultiplier = year === '2024' ? 1 : year === '2023' ? 0.8 : 0.6;
    
    if (placementStatsChart) {
        placementStatsChart.data.datasets[0].data = dummyData.branchOffers.map(val => Math.round(val * yearMultiplier));
        placementStatsChart.data.datasets[1].data = dummyData.branchApplications.map(val => Math.round(val * yearMultiplier));
        placementStatsChart.update();
    }
    
    if (packageDistributionChart) {
        packageDistributionChart.data.datasets[0].data = dummyData.packageDistribution.map(val => Math.round(val * yearMultiplier));
        packageDistributionChart.update();
    }
    
    if (companyPerformanceChart) {
        companyPerformanceChart.data.datasets[0].data = dummyData.companyPerformance.map(company => 
            Math.round(company.offers * yearMultiplier)
        );
        companyPerformanceChart.update();
    }
}

// Switch between login and register tabs
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// Handle user login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('user-type').value;
    
    const user = users.find(u => u.email === email && u.password === password && u.role === role);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showDashboard(role);
        
        // Auto-fill registration form with login details
        document.getElementById('register-email').value = email;
        document.getElementById('register-password').value = password;
    } else {
        alert('Invalid credentials or user role. Please try again.');
    }
}

// Handle user registration
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const adminCode = document.getElementById('admin-code').value;
    const branch = document.getElementById('register-branch').value;
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
        alert('User with this email already exists.');
        return;
    }
    
    // Validate admin code if registering as admin
    if (role === 'admin' && adminCode !== 'admin123') {
        alert('Invalid admin code.');
        return;
    }
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        name,
        email,
        password,
        role
    };
    
    // Add student-specific fields
    if (role === 'student') {
        newUser.branch = branch;
        newUser.studentId = `${branch.toUpperCase()}2023${(users.filter(u => u.role === 'student').length + 1).toString().padStart(3, '0')}`;
        newUser.cgpa = 0;
        newUser.phone = '';
        newUser.address = '';
    }
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Registration successful! You can now login.');
    switchAuthTab('login');
    
    // Auto-fill login form
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    document.getElementById('user-type').value = role;
}

// Handle logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    authSection.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
    studentDashboard.classList.add('hidden');
}

// Show appropriate dashboard based on user role
function showDashboard(role) {
    authSection.classList.add('hidden');
    
    if (role === 'admin') {
        adminDashboard.classList.remove('hidden');
        document.getElementById('admin-name').textContent = currentUser.name;
        renderAdminData();
        updateAdminOverview();
        // Initialize analytics cards
        updateAnalyticsCards();
        // Reinitialize charts for admin dashboard
        setTimeout(initializeCharts, 300);
    } else {
        studentDashboard.classList.remove('hidden');
        document.getElementById('student-name').textContent = currentUser.name;
        renderStudentData();
    }
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

// Show add placement modal
function showAddPlacementModal() {
    document.getElementById('placement-modal-title').textContent = 'Add New Placement';
    document.getElementById('placement-submit-btn').textContent = 'Add Placement';
    resetPlacementForm();
    showModal('add-placement-modal');
}

// Show edit placement modal
function showEditPlacementModal(placementId) {
    const placement = placements.find(p => p.id === placementId);
    if (!placement) return;
    
    document.getElementById('placement-modal-title').textContent = 'Edit Placement';
    document.getElementById('placement-submit-btn').textContent = 'Update Placement';
    document.getElementById('placement-id').value = placement.id;
    document.getElementById('company-name').value = placement.company;
    document.getElementById('position').value = placement.position;
    document.getElementById('package').value = placement.package;
    document.getElementById('eligibility').value = placement.eligibility;
    document.getElementById('description').value = placement.description;
    document.getElementById('deadline').value = placement.deadline;
    
    // Reset checkboxes
    document.querySelectorAll('input[name="branch"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Set checked branches
    placement.branches.forEach(branch => {
        const checkbox = document.querySelector(`input[name="branch"][value="${branch}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    currentEditingPlacementId = placementId;
    showModal('add-placement-modal');
}

// Reset placement form
function resetPlacementForm() {
    document.getElementById('placement-form').reset();
    document.getElementById('placement-id').value = '';
    currentEditingPlacementId = null;
}

// Show edit profile modal with current data
function showEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    document.getElementById('edit-name').value = currentUser.name;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-address').value = currentUser.address || '';
    document.getElementById('edit-cgpa').value = currentUser.cgpa || '';
    modal.classList.remove('hidden');
}

// Show view details modal
function showViewDetailsModal(placementId) {
    const placement = placements.find(p => p.id === placementId);
    if (!placement) return;
    
    document.getElementById('view-details-title').textContent = `${placement.company} - ${placement.position}`;
    document.getElementById('view-company').textContent = placement.company;
    document.getElementById('view-position').textContent = placement.position;
    document.getElementById('view-package').textContent = `₹${placement.package} LPA`;
    document.getElementById('view-deadline').textContent = formatDate(placement.deadline);
    document.getElementById('view-branches').textContent = getBranchNames(placement.branches).join(', ');
    document.getElementById('view-eligibility').textContent = placement.eligibility;
    document.getElementById('view-description').textContent = placement.description;
    
    showModal('view-details-modal');
}

// Show view application modal
function showViewApplicationModal(applicationId) {
    const application = applications.find(a => a.id === applicationId);
    if (!application) return;
    
    document.getElementById('view-app-company').textContent = application.company;
    document.getElementById('view-app-position').textContent = application.position;
    document.getElementById('view-app-date').textContent = formatDate(application.appliedDate);
    document.getElementById('view-app-status').textContent = application.status;
    document.getElementById('view-app-status').className = `status ${application.status}`;
    document.getElementById('view-app-cover-letter').textContent = application.coverLetter || 'No cover letter provided.';
    
    showModal('view-application-modal');
}

// Handle add or edit placement
function handleAddOrEditPlacement(e) {
    e.preventDefault();
    
    const company = document.getElementById('company-name').value;
    const position = document.getElementById('position').value;
    const package = parseFloat(document.getElementById('package').value);
    const eligibility = document.getElementById('eligibility').value;
    const description = document.getElementById('description').value;
    const deadline = document.getElementById('deadline').value;
    
    const branchCheckboxes = document.querySelectorAll('input[name="branch"]:checked');
    const branches = Array.from(branchCheckboxes).map(cb => cb.value);
    
    if (branches.length === 0) {
        alert('Please select at least one eligible branch.');
        return;
    }
    
    if (currentEditingPlacementId) {
        // Update existing placement
        const placementIndex = placements.findIndex(p => p.id === currentEditingPlacementId);
        if (placementIndex !== -1) {
            placements[placementIndex] = {
                ...placements[placementIndex],
                company,
                position,
                package,
                eligibility,
                description,
                deadline,
                branches,
                status: 'active'
            };
        }
    } else {
        // Add new placement - generate a unique ID
        const newId = placements.length > 0 ? Math.max(...placements.map(p => p.id)) + 1 : 1;
        const newPlacement = {
            id: newId,
            company,
            position,
            package,
            eligibility,
            description,
            deadline,
            branches,
            status: 'active'
        };
        
        placements.push(newPlacement);
    }
    
    localStorage.setItem('placements', JSON.stringify(placements));
    
    document.getElementById('add-placement-modal').classList.add('hidden');
    resetPlacementForm();
    
    console.log('Placements after add/edit:', placements);
    
    // Force refresh all placement displays
    renderPlacements();
    renderUpcomingPlacements();
    renderAvailablePlacements();
    updateAdminOverview();
    
    alert(`Placement ${currentEditingPlacementId ? 'updated' : 'added'} successfully!`);
}

// Handle add student
function handleAddStudent(e) {
    e.preventDefault();
    
    const name = document.getElementById('student-name').value;
    const email = document.getElementById('student-email').value;
    const branch = document.getElementById('student-branch').value;
    const studentId = document.getElementById('student-id').value;
    const cgpa = parseFloat(document.getElementById('student-cgpa').value);
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
        alert('User with this email already exists.');
        return;
    }
    
    const newUser = {
        id: users.length + 1,
        name,
        email,
        password: 'password123', // Default password
        role: 'student',
        branch,
        studentId,
        cgpa,
        phone: '',
        address: ''
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    document.getElementById('student-form').reset();
    document.getElementById('add-student-modal').classList.add('hidden');
    
    renderStudents();
    updateAdminOverview();
    
    alert('Student added successfully!');
}

// Handle edit student
function handleEditStudent(e) {
    e.preventDefault();
    
    const studentId = parseInt(document.getElementById('edit-student-id').value);
    const name = document.getElementById('edit-student-name').value;
    const email = document.getElementById('edit-student-email').value;
    const branch = document.getElementById('edit-student-branch').value;
    const cgpa = parseFloat(document.getElementById('edit-student-cgpa').value);
    const phone = document.getElementById('edit-student-phone').value;
    const address = document.getElementById('edit-student-address').value;
    
    // Find and update student
    const studentIndex = users.findIndex(u => u.id === studentId);
    if (studentIndex !== -1) {
        users[studentIndex] = {
            ...users[studentIndex],
            name,
            email,
            branch,
            cgpa,
            phone,
            address
        };
        
        localStorage.setItem('users', JSON.stringify(users));
        document.getElementById('edit-student-modal').classList.add('hidden');
        renderStudents();
        alert('Student updated successfully!');
    }
}

// Handle edit profile
function handleEditProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    const cgpa = parseFloat(document.getElementById('edit-cgpa').value);
    
    // Update current user
    currentUser.name = name;
    currentUser.email = email;
    currentUser.phone = phone;
    currentUser.address = address;
    currentUser.cgpa = cgpa;
    
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    document.getElementById('edit-profile-modal').classList.add('hidden');
    renderStudentData();
    
    alert('Profile updated successfully!');
}

// Handle apply for placement
function handleApplyForPlacement(e) {
    e.preventDefault();
    
    const placementId = parseInt(document.getElementById('apply-placement-modal').getAttribute('data-placement-id'));
    const placement = placements.find(p => p.id === placementId);
    if (!placement) {
        alert('Placement not found!');
        return;
    }
    
    // Check if deadline has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(placement.deadline);
    deadline.setHours(23, 59, 59, 999);
    
    if (deadline < today) {
        alert('Sorry, the application deadline for this placement has passed.');
        return;
    }
    
    // Check if already applied
    const existingApp = applications.find(app => 
        app.studentId === currentUser.id && app.placementId === placementId
    );
    
    if (existingApp) {
        alert('You have already applied for this placement.');
        return;
    }
    
    const coverLetter = document.getElementById('apply-cover-letter').value;
    
    const newApplication = {
        id: applications.length + 1,
        studentId: currentUser.id,
        placementId: placementId,
        company: placement.company,
        position: placement.position,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        coverLetter: coverLetter
    };
    
    applications.push(newApplication);
    localStorage.setItem('applications', JSON.stringify(applications));
    
    document.getElementById('apply-placement-modal').classList.add('hidden');
    document.getElementById('apply-form').reset();
    
    renderStudentApplications();
    renderApplications();
    updateAdminOverview();
    renderStudentData();
    
    alert('Application submitted successfully!');
}

// Render placements in admin dashboard
function renderPlacements() {
    const container = document.querySelector('.placement-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    console.log('Rendering placements in admin dashboard:', placements);
    
    if (placements.length === 0) {
        container.innerHTML = '<div class="no-data">No placements available. Add your first placement!</div>';
        return;
    }
    
    placements.forEach(placement => {
        const card = document.createElement('div');
        card.className = 'placement-card';
        card.innerHTML = `
            <div class="placement-header">
                <h3>${placement.company}</h3>
                <p>${placement.position}</p>
            </div>
            <div class="placement-body">
                <div class="placement-details">
                    <div class="detail-item">
                        <span class="detail-label">Package:</span>
                        <span class="detail-value package">₹${placement.package} LPA</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Deadline:</span>
                        <span class="detail-value">${formatDate(placement.deadline)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Eligible Branches:</span>
                        <span class="detail-value">${getBranchNames(placement.branches).join(', ')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status ${placement.status}">${placement.status}</span>
                    </div>
                </div>
                <div class="placement-actions">
                    <button class="btn-primary" onclick="showEditPlacementModal(${placement.id})">Edit</button>
                    <button class="btn-secondary" onclick="showViewDetailsModal(${placement.id})">View Details</button>
                    <button class="btn-logout" onclick="deletePlacement(${placement.id})">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render students in admin dashboard
function renderStudents() {
    const branchFilter = document.getElementById('branch-filter');
    if (!branchFilter) return;
    
    const branchFilterValue = branchFilter.value;
    const studentUsers = users.filter(u => u.role === 'student');
    const filteredStudents = branchFilterValue === 'all' 
        ? studentUsers 
        : studentUsers.filter(s => s.branch === branchFilterValue);
    
    const tbody = document.querySelector('.students-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.studentId}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${getBranchName(student.branch)}</td>
            <td>
                <span class="status ${getStudentStatus(student)}">${getStudentStatus(student)}</span>
            </td>
            <td>
                <button class="btn-primary" onclick="viewStudent(${student.id})">View</button>
                <button class="btn-secondary" onclick="editStudent(${student.id})">Edit</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render applications in admin dashboard
function renderApplications() {
    const container = document.querySelector('.applications-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    applications.forEach(app => {
        const student = users.find(u => u.id === app.studentId);
        if (!student) return;
        
        const card = document.createElement('div');
        card.className = 'placement-card';
        card.innerHTML = `
            <div class="placement-header">
                <h3>${app.company}</h3>
                <p>${app.position}</p>
            </div>
            <div class="placement-body">
                <div class="placement-details">
                    <div class="detail-item">
                        <span class="detail-label">Student:</span>
                        <span class="detail-value">${student.name} (${student.studentId})</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Applied Date:</span>
                        <span class="detail-value">${formatDate(app.appliedDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status ${app.status}">${app.status}</span>
                    </div>
                </div>
                <div class="placement-actions">
                    <button class="btn-primary" onclick="updateApplicationStatus(${app.id}, 'approved')">Approve</button>
                    <button class="btn-secondary" onclick="updateApplicationStatus(${app.id}, 'rejected')">Reject</button>
                    <button class="btn-info" onclick="showViewApplicationModal(${app.id})">View</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render student applications
function renderStudentApplications() {
    if (!currentUser || currentUser.role !== 'student') return;
    
    const studentApps = applications.filter(app => app.studentId === currentUser.id);
    const tbody = document.querySelector('.applications-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    studentApps.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.company}</td>
            <td>${app.position}</td>
            <td>${formatDate(app.appliedDate)}</td>
            <td>
                <span class="status ${app.status}">${app.status}</span>
            </td>
            <td>
                <button class="btn-primary" onclick="showViewApplicationModal(${app.id})">View</button>
                <button class="btn-secondary" onclick="withdrawApplication(${app.id})">Withdraw</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render upcoming placements for student dashboard - FIXED VERSION
function renderUpcomingPlacements() {
    const container = document.querySelector('.upcoming-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentUser || !currentUser.branch) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = placements
        .filter(p => {
            const deadline = new Date(p.deadline);
            deadline.setHours(23, 59, 59, 999);
            return p.status === 'active' && 
                   deadline > today && 
                   p.branches.includes(currentUser.branch);
        })
        .slice(0, 3);
    
    console.log('Upcoming placements for student:', upcoming);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<div class="no-data">No upcoming placement drives.</div>';
        return;
    }
    
    upcoming.forEach(placement => {
        const card = document.createElement('div');
        card.className = 'placement-card';
        card.innerHTML = `
            <div class="placement-header">
                <h3>${placement.company}</h3>
                <p>${placement.position}</p>
            </div>
            <div class="placement-body">
                <div class="placement-details">
                    <div class="detail-item">
                        <span class="detail-label">Package:</span>
                        <span class="detail-value package">₹${placement.package} LPA</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Deadline:</span>
                        <span class="detail-value">${formatDate(placement.deadline)}</span>
                    </div>
                </div>
                <div class="placement-actions">
                    <button class="btn-primary" onclick="showViewDetailsModal(${placement.id})">View Details</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render available placements for student dashboard - FIXED VERSION
function renderAvailablePlacements() {
    const container = document.querySelector('.placement-cards');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentUser || !currentUser.branch) {
        console.log('No current user or branch found');
        container.innerHTML = '<div class="no-data">Please login as a student to view placements.</div>';
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Current user branch:', currentUser.branch);
    console.log('All placements:', placements);
    console.log('Today\'s date:', today);
    
    const available = placements.filter(p => {
        // Check if placement is active
        if (p.status !== 'active') {
            console.log(`Placement ${p.id} is not active`);
            return false;
        }
        
        // Check if deadline is in future
        const deadline = new Date(p.deadline);
        deadline.setHours(23, 59, 59, 999);
        const isDeadlineValid = deadline > today;
        
        if (!isDeadlineValid) {
            console.log(`Placement ${p.id} deadline ${p.deadline} has passed`);
            return false;
        }
        
        // Check if student's branch is eligible
        const isBranchEligible = p.branches.includes(currentUser.branch);
        
        if (!isBranchEligible) {
            console.log(`Placement ${p.id} not eligible for branch ${currentUser.branch}. Eligible branches: ${p.branches.join(', ')}`);
            return false;
        }
        
        console.log(`Placement ${p.id} is available for student`);
        return true;
    });
    
    console.log('Available placements after filtering:', available);
    
    if (available.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <h3>No placements available</h3>
                <p>There are currently no placement opportunities available for your branch (${getBranchName(currentUser.branch)}).</p>
                <p>Check back later or contact your placement coordinator.</p>
            </div>
        `;
        return;
    }
    
    available.forEach(placement => {
        const card = document.createElement('div');
        card.className = 'placement-card';
        card.innerHTML = `
            <div class="placement-header">
                <h3>${placement.company}</h3>
                <p>${placement.position}</p>
            </div>
            <div class="placement-body">
                <div class="placement-details">
                    <div class="detail-item">
                        <span class="detail-label">Package:</span>
                        <span class="detail-value package">₹${placement.package} LPA</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Deadline:</span>
                        <span class="detail-value">${formatDate(placement.deadline)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Eligibility:</span>
                        <span class="detail-value">${placement.eligibility}</span>
                    </div>
                </div>
                <div class="placement-description">
                    <p>${placement.description}</p>
                </div>
                <div class="placement-actions">
                    <button class="btn-primary" onclick="applyForPlacement(${placement.id})">Apply Now</button>
                    <button class="btn-secondary" onclick="showViewDetailsModal(${placement.id})">View Details</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render admin data
function renderAdminData() {
    renderPlacements();
    renderStudents();
    renderApplications();
}

// Render student data
function renderStudentData() {
    // Update profile information
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-branch').textContent = getBranchName(currentUser.branch);
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-id').textContent = currentUser.studentId;
    document.getElementById('profile-cgpa').textContent = currentUser.cgpa || 'N/A';
    document.getElementById('profile-phone').textContent = currentUser.phone || 'N/A';
    document.getElementById('profile-address').textContent = currentUser.address || 'N/A';
    
    // Update stats
    const appCount = applications.filter(app => app.studentId === currentUser.id).length;
    document.getElementById('student-applications-count').textContent = appCount;
    
    const availableCount = placements.filter(p => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(p.deadline);
        deadline.setHours(23, 59, 59, 999);
        return p.status === 'active' && 
               deadline > today &&
               p.branches.includes(currentUser.branch);
    }).length;
    
    document.getElementById('available-companies-count').textContent = availableCount;
    
    // For demo purposes, set upcoming interviews to 2
    document.getElementById('upcoming-interviews-count').textContent = '2';
    
    renderStudentApplications();
    renderUpcomingPlacements();
    renderAvailablePlacements();
}

// Update admin overview
function updateAdminOverview() {
    // Update counts
    const activePlacements = placements.filter(p => p.status === 'active').length;
    const registeredStudents = users.filter(u => u.role === 'student').length;
    const totalApplications = applications.length;
    const placementsThisYear = applications.filter(app => 
        app.status === 'approved' && 
        new Date(app.appliedDate).getFullYear() === new Date().getFullYear()
    ).length;
    
    document.getElementById('active-placements-count').textContent = activePlacements;
    document.getElementById('registered-students-count').textContent = registeredStudents;
    document.getElementById('applications-count').textContent = totalApplications;
    document.getElementById('placements-this-year').textContent = placementsThisYear;
    
    // Update charts data
    updateChartsData();
}

// Update charts data
function updateChartsData() {
    if (!branchChart || !monthlyChart) return;
    
    // Update branch chart data
    const branchData = {
        'cs': 0,
        'it': 0,
        'ece': 0,
        'me': 0,
        'ce': 0
    };
    
    applications.forEach(app => {
        const student = users.find(u => u.id === app.studentId);
        if (student && student.branch) {
            branchData[student.branch]++;
        }
    });
    
    branchChart.data.datasets[0].data = [
        branchData.cs,
        branchData.it,
        branchData.ece,
        branchData.me,
        branchData.ce
    ];
    branchChart.update();
    
    // Update monthly chart data (simplified for demo)
    const monthlyData = new Array(12).fill(0);
    applications.forEach(app => {
        const month = new Date(app.appliedDate).getMonth();
        monthlyData[month]++;
    });
    
    monthlyChart.data.datasets[0].data = monthlyData;
    monthlyChart.update();
}

// Apply for a placement
function applyForPlacement(placementId) {
    const placement = placements.find(p => p.id === placementId);
    if (!placement) {
        alert('Placement not found!');
        return;
    }
    
    // Check if deadline has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(placement.deadline);
    deadline.setHours(23, 59, 59, 999);
    
    if (deadline < today) {
        alert('Sorry, the application deadline for this placement has passed.');
        return;
    }
    
    // Check if already applied
    const existingApp = applications.find(app => 
        app.studentId === currentUser.id && app.placementId === placementId
    );
    
    if (existingApp) {
        alert('You have already applied for this placement.');
        return;
    }
    
    // Show apply modal
    const modal = document.getElementById('apply-placement-modal');
    document.getElementById('apply-company').value = placement.company;
    document.getElementById('apply-position').value = placement.position;
    modal.setAttribute('data-placement-id', placementId);
    
    modal.classList.remove('hidden');
}

// Update application status
function updateApplicationStatus(appId, status) {
    const appIndex = applications.findIndex(app => app.id === appId);
    if (appIndex !== -1) {
        applications[appIndex].status = status;
        localStorage.setItem('applications', JSON.stringify(applications));
        renderApplications();
        renderStudentApplications();
        
        alert(`Application ${status} successfully!`);
    }
}

// Download student list
function downloadStudentList() {
    const branchFilter = document.getElementById('branch-filter');
    if (!branchFilter) return;
    
    const branchFilterValue = branchFilter.value;
    const studentUsers = users.filter(u => u.role === 'student');
    const filteredStudents = branchFilterValue === 'all' 
        ? studentUsers 
        : studentUsers.filter(s => s.branch === branchFilterValue);
    
    // Create CSV content
    let csvContent = "Student ID,Name,Email,Branch,Status\n";
    
    filteredStudents.forEach(student => {
        const status = getStudentStatus(student);
        csvContent += `${student.studentId},${student.name},${student.email},${getBranchName(student.branch)},${status}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${branchFilterValue === 'all' ? 'all' : branchFilterValue}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Student list downloaded successfully!');
}

// Download PDF report
function downloadPDF() {
    const year = document.getElementById('report-year').value;
    
    // In a real application, this would generate a PDF using a library like jsPDF
    // For this demo, we'll create a simple text representation
    
    const reportData = `
        PLACEMENT REPORT - ${year}
        =============================
        
        Placement Rate: ${document.getElementById('placement-rate').textContent}
        Average Package: ${document.getElementById('avg-package').textContent}
        Highest Package: ${document.getElementById('highest-package').textContent}
        Companies Visited: ${document.getElementById('companies-visited').textContent}
        
        Detailed Report:
        ${Array.from(document.querySelectorAll('.report-table tbody tr'))
            .map(row => Array.from(row.cells).map(cell => cell.textContent).join(' | '))
            .join('\n')}
    `;
    
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placement_report_${year}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Report downloaded successfully!');
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getBranchName(branchCode) {
    const branches = {
        'cs': 'Computer Science',
        'it': 'Information Technology',
        'ece': 'Electronics & Communication',
        'me': 'Mechanical Engineering',
        'ce': 'Civil Engineering'
    };
    return branches[branchCode] || branchCode;
}

function getBranchNames(branchCodes) {
    return branchCodes.map(code => getBranchName(code));
}

function getStudentStatus(student) {
    // Simplified status logic
    const placed = applications.some(app => 
        app.studentId === student.id && app.status === 'approved'
    );
    return placed ? 'placed' : 'searching';
}

// Student management functions
function viewStudent(id) {
    const student = users.find(u => u.id === id);
    if (!student) return;
    
    alert(`Student Details:\n\nName: ${student.name}\nEmail: ${student.email}\nBranch: ${getBranchName(student.branch)}\nStudent ID: ${student.studentId}\nCGPA: ${student.cgpa || 'N/A'}\nPhone: ${student.phone || 'N/A'}\nAddress: ${student.address || 'N/A'}`);
}

function editStudent(id) {
    const student = users.find(u => u.id === id);
    if (!student) return;
    
    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('edit-student-name').value = student.name;
    document.getElementById('edit-student-email').value = student.email;
    document.getElementById('edit-student-branch').value = student.branch;
    document.getElementById('edit-student-cgpa').value = student.cgpa || '';
    document.getElementById('edit-student-phone').value = student.phone || '';
    document.getElementById('edit-student-address').value = student.address || '';
    
    showModal('edit-student-modal');
}

// Placeholder functions for future implementation
function deletePlacement(id) {
    if (confirm('Are you sure you want to delete this placement?')) {
        placements = placements.filter(p => p.id !== id);
        localStorage.setItem('placements', JSON.stringify(placements));
        renderPlacements();
        renderUpcomingPlacements();
        renderAvailablePlacements();
        updateAdminOverview();
        alert('Placement deleted successfully!');
    }
}

function withdrawApplication(id) {
    if (confirm('Are you sure you want to withdraw this application?')) {
        applications = applications.filter(app => app.id !== id);
        localStorage.setItem('applications', JSON.stringify(applications));
        renderStudentApplications();
        renderApplications();
        updateAdminOverview();
        renderStudentData();
        alert('Application withdrawn successfully!');
    }
}

// Debug function to check placement data
function debugPlacements() {
    console.log('=== PLACEMENTS DEBUG INFO ===');
    console.log('Total placements:', placements.length);
    console.log('Placements:', placements);
    
    if (currentUser) {
        console.log('Current user:', currentUser);
        console.log('User branch:', currentUser.branch);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const availableForStudent = placements.filter(p => {
            const deadline = new Date(p.deadline);
            deadline.setHours(23, 59, 59, 999);
            return p.status === 'active' && 
                   deadline > today && 
                   p.branches.includes(currentUser.branch);
        });
        
        console.log('Placements available for student:', availableForStudent);
    }
}