// Define exportToPDF function globally
let exportToPDF;

document.addEventListener('DOMContentLoaded', function() {
    // Elements - safely get them as they may not exist on all pages
    const generateBtn = document.getElementById('generate-plan-btn');
    const riskForm = document.getElementById('risk-form');
    const planContainer = document.getElementById('plan-container');
    const exportBtn = document.getElementById('export-btn');
    const printBtn = document.getElementById('print-btn');
    const savePlanBtn = document.getElementById('save-plan-btn');

    // Hide the plan container and export buttons initially - only if they exist
    if (planContainer && window.location.pathname === '/') {
        planContainer.classList.add('d-none');
    }
    
    // Handle domain toggles
    const domainToggles = document.querySelectorAll('.domain-toggle');
    if (domainToggles.length > 0) {
        domainToggles.forEach(toggle => {
            // Set initial state - domains are disabled by default
            const domainId = toggle.getAttribute('data-domain-id');
            const contentSection = document.getElementById(`domain_content_${domainId}`);
            
            // Disable domain initially (since checkbox is unchecked by default)
            contentSection.classList.add('disabled');
            contentSection.querySelectorAll('input').forEach(input => {
                input.disabled = true;
            });
            
            // Handle toggle changes
            toggle.addEventListener('change', function() {
                if (this.checked) {
                    // Enable domain
                    contentSection.classList.remove('disabled');
                    contentSection.querySelectorAll('input').forEach(input => {
                        input.disabled = false;
                    });
                } else {
                    // Disable domain
                    contentSection.classList.add('disabled');
                    contentSection.querySelectorAll('input').forEach(input => {
                        input.disabled = true;
                    });
                }
            });
        });
    }
    
    // Handle form submission to generate a case plan
    if (riskForm) {
        riskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading spinner
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            generateBtn.disabled = true;
            
            // Get form data
            const formData = new FormData(riskForm);
            
            // Add domain toggle states to the form data
            domainToggles.forEach(toggle => {
                const domainId = toggle.getAttribute('data-domain-id');
                formData.append(`include_${domainId}`, toggle.checked);
            });
            
            // Get CSRF token from the form
            const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;
            
            // Send request to server
            fetch('/generate_plan', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showAlert('Error: ' + data.error, 'danger');
                } else {
                    displayCasePlan(data);
                    
                    // Only manipulate the DOM if these elements exist
                    if (planContainer) {
                        planContainer.classList.remove('d-none');
                        
                        // Scroll to the plan container
                        planContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                    
                    const exportControls = document.getElementById('export-controls');
                    if (exportControls) {
                        exportControls.classList.remove('d-none');
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while generating the case plan.', 'danger');
            })
            .finally(() => {
                // Reset button
                generateBtn.innerHTML = 'Generate Case Plan';
                generateBtn.disabled = false;
            });
        });
    }
    
    // Function to display the generated case plan
    function displayCasePlan(planData) {
        const planContent = document.getElementById('plan-content');
        planContent.innerHTML = '';
        
        // Get client name and plan title from form
        const clientName = document.getElementById('client_name').value;
        const planTitle = document.getElementById('plan_title').value;
        
        // Create header
        const header = document.createElement('div');
        header.classList.add('mb-4');
        header.innerHTML = `
            <h2 class="mb-3 editable" contenteditable="true">${planTitle}</h2>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-floating mb-3">
                        <input type="text" class="form-control" id="client-name" placeholder="Client Name" value="${clientName}">
                        <label for="client-name">Client Name</label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-floating mb-3">
                        <input type="date" class="form-control" id="plan-date" value="${new Date().toISOString().split('T')[0]}">
                        <label for="plan-date">Date</label>
                    </div>
                </div>
            </div>
            <hr>
        `;
        planContent.appendChild(header);
        
        // Create a container for the domains
        const domainsContainer = document.createElement('div');
        domainsContainer.classList.add('domains-container');
        
        // Add each domain to the plan
        planData.domains.forEach(domain => {
            const domainEl = document.createElement('div');
            domainEl.classList.add('domain-section', 'mb-4', 'p-3', 'border', 'rounded');
            
            // Domain header with risk level
            const domainHeader = document.createElement('div');
            domainHeader.classList.add('domain-header', 'mb-3');
            
            // Get the appropriate badge class based on risk level
            let badgeClass = 'bg-secondary';
            
            if (domain.risk_level === 'Low') {
                badgeClass = 'bg-success';
            } else if (domain.risk_level === 'Medium') {
                badgeClass = 'bg-warning';
            } else if (domain.risk_level === 'High') {
                badgeClass = 'bg-danger';
            }
            
            domainHeader.innerHTML = `
                <h3 class="editable" contenteditable="true">${domain.name}</h3>
                <span class="badge ${badgeClass}">${domain.risk_level} Risk</span>
            `;
            domainEl.appendChild(domainHeader);
            
            // Goals section
            if (domain.goals && domain.goals.length > 0) {
                const goalsSection = document.createElement('div');
                goalsSection.classList.add('goals-section', 'mb-3');
                
                goalsSection.innerHTML = `
                    <h4>Goals</h4>
                    <ul class="list-group list-group-flush">
                        ${domain.goals.map(goal => `
                            <li class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="editable" contenteditable="true">${goal}</div>
                                    <button class="btn btn-sm btn-outline-danger remove-btn" title="Remove goal" onclick="event.preventDefault(); this.closest('li').remove();">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                `;
                domainEl.appendChild(goalsSection);
            }
            
            // Objectives section
            if (domain.objectives && domain.objectives.length > 0) {
                const objectivesSection = document.createElement('div');
                objectivesSection.classList.add('objectives-section', 'mb-3');
                
                objectivesSection.innerHTML = `
                    <h4>Objectives</h4>
                    <ul class="list-group list-group-flush">
                        ${domain.objectives.map(objective => `
                            <li class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="editable" contenteditable="true">${objective}</div>
                                    <button class="btn btn-sm btn-outline-danger remove-btn" title="Remove objective" onclick="event.preventDefault(); this.closest('li').remove();">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                `;
                domainEl.appendChild(objectivesSection);
            }
            
            // Tasks section
            if (domain.tasks && domain.tasks.length > 0) {
                const tasksSection = document.createElement('div');
                tasksSection.classList.add('tasks-section', 'mb-3');
                
                tasksSection.innerHTML = `
                    <h4>Tasks</h4>
                    <ul class="list-group list-group-flush">
                        ${domain.tasks.map(task => {
                            // Extract task text if it's an object with a 'text' property, otherwise use as is
                            const taskText = typeof task === 'object' && task !== null && task.text ? task.text : task;
                            const isCompleted = typeof task === 'object' && task !== null && task.completed === true;
                            
                            return `
                            <li class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="d-flex align-items-center flex-grow-1">
                                        <input class="form-check-input me-3" type="checkbox" ${isCompleted ? 'checked' : ''}>
                                        <div class="editable" contenteditable="true">${taskText}</div>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger remove-btn ms-2" title="Remove task" onclick="event.preventDefault(); this.closest('li').remove();">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </li>
                            `;
                        }).join('')}
                    </ul>
                `;
                domainEl.appendChild(tasksSection);
            }
            
            // Add button to add custom items
            const addItemSection = document.createElement('div');
            addItemSection.classList.add('add-item-section', 'mt-3');
            
            addItemSection.innerHTML = `
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-secondary btn-sm add-goal-btn">
                        <i class="bi bi-plus-circle"></i> Add Goal
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm add-objective-btn">
                        <i class="bi bi-plus-circle"></i> Add Objective
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm add-task-btn">
                        <i class="bi bi-plus-circle"></i> Add Task
                    </button>
                </div>
            `;
            
            // Add event listeners to the buttons
            addItemSection.querySelector('.add-goal-btn').addEventListener('click', function() {
                addItem(domainEl, 'goal');
            });
            
            addItemSection.querySelector('.add-objective-btn').addEventListener('click', function() {
                addItem(domainEl, 'objective');
            });
            
            addItemSection.querySelector('.add-task-btn').addEventListener('click', function() {
                addItem(domainEl, 'task');
            });
            
            domainEl.appendChild(addItemSection);
            domainsContainer.appendChild(domainEl);
        });
        
        planContent.appendChild(domainsContainer);
        
        // Make the plan sections editable
        makeEditable();
    }
    
    // Function to add a new item to a domain section
    function addItem(domainEl, itemType) {
        let sectionClass, headerText, sectionSelector;
        
        switch (itemType) {
            case 'goal':
                sectionClass = 'goals-section';
                headerText = 'Goals';
                sectionSelector = '.goals-section';
                break;
            case 'objective':
                sectionClass = 'objectives-section';
                headerText = 'Objectives';
                sectionSelector = '.objectives-section';
                break;
            case 'task':
                sectionClass = 'tasks-section';
                headerText = 'Tasks';
                sectionSelector = '.tasks-section';
                break;
            default:
                return;
        }
        
        // Check if section already exists
        let section = domainEl.querySelector(sectionSelector);
        
        if (!section) {
            // Create a new section if it doesn't exist
            section = document.createElement('div');
            section.classList.add(sectionClass, 'mb-3');
            section.innerHTML = `
                <h4>${headerText}</h4>
                <ul class="list-group list-group-flush"></ul>
            `;
            
            // Insert the new section before the add item section
            domainEl.insertBefore(section, domainEl.querySelector('.add-item-section'));
        }
        
        const listGroup = section.querySelector('.list-group');
        
        // Create new item
        const newItem = document.createElement('li');
        newItem.classList.add('list-group-item');
        
        if (itemType === 'task') {
            newItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center flex-grow-1">
                        <input class="form-check-input me-3" type="checkbox">
                        <div class="editable" contenteditable="true">New task</div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-btn ms-2" title="Remove task" onclick="event.preventDefault(); this.closest('li').remove();">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        } else {
            newItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="editable" contenteditable="true">New ${itemType}</div>
                    <button class="btn btn-sm btn-outline-danger remove-btn" title="Remove ${itemType}" onclick="event.preventDefault(); this.closest('li').remove();">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        }
        
        listGroup.appendChild(newItem);
        
        // Focus on the new item
        const editableDiv = newItem.querySelector('.editable');
        editableDiv.focus();
        
        // Select all text in the contenteditable div
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editableDiv);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    // Function to make the plan sections editable
    function makeEditable() {
        const editableElements = document.querySelectorAll('.editable');
        editableElements.forEach(element => {
            element.addEventListener('focus', function() {
                element.classList.add('editing');
            });
            element.addEventListener('blur', function() {
                element.classList.remove('editing');
            });
        });
    }
    
    // Handle export to PDF button
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportToPDF();
        });
    }
    
    // Handle print button
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Handle save plan button
    if (savePlanBtn) {
        savePlanBtn.addEventListener('click', function() {
            saveCasePlan();
        });
    }
    
    // Function to save the case plan to the database
    function saveCasePlan() {
        showAlert('Saving case plan...', 'info');
        
        // Collect plan data
        const planData = collectPlanData();
        
        // Get the CSRF token from the meta tag
        const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;
        
        // Send request to server to save the plan
        fetch('/case_plan/' + (planData.id || '0') + '/edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(planData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Case plan saved successfully!', 'success');
                
                // Always redirect to the main page after saving
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                showAlert('Error: ' + (data.message || 'Could not save the case plan'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while saving the case plan', 'danger');
        });
    }
    
    // Function to collect all plan data from the DOM
    function collectPlanData() {
        const planContent = document.getElementById('plan-content');
        const clientNameInput = document.getElementById('client-name');
        const planDateInput = document.getElementById('plan-date');
        const planTitleElement = planContent.querySelector('h2.editable');
        
        // Get the plan ID if it exists (for editing existing plans)
        const planId = planContent.getAttribute('data-plan-id');
        
        // Basic plan info
        const planData = {
            plan_title: planTitleElement ? planTitleElement.textContent : 'Case Plan',
            client_name: clientNameInput ? clientNameInput.value : 'Client',
            created_date: planDateInput ? planDateInput.value : new Date().toISOString().split('T')[0],
            domains: [],
            id: planId || null
        };
        
        // Get all domains
        const domainSections = planContent.querySelectorAll('.domain-section');
        domainSections.forEach(domainSection => {
            const domainName = domainSection.querySelector('h3.editable').textContent;
            const riskLevelBadge = domainSection.querySelector('.badge');
            const riskLevel = riskLevelBadge ? riskLevelBadge.textContent.replace(' Risk', '') : 'Medium';
            
            // Create domain object
            const domain = {
                name: domainName,
                id: domainName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                risk_level: riskLevel,
                goals: [],
                objectives: [],
                tasks: []
            };
            
            // Collect goals
            const goalsSection = domainSection.querySelector('.goals-section');
            if (goalsSection) {
                const goalItems = goalsSection.querySelectorAll('.list-group-item .editable');
                goalItems.forEach(goal => {
                    domain.goals.push(goal.textContent);
                });
            }
            
            // Collect objectives
            const objectivesSection = domainSection.querySelector('.objectives-section');
            if (objectivesSection) {
                const objectiveItems = objectivesSection.querySelectorAll('.list-group-item .editable');
                objectiveItems.forEach(objective => {
                    domain.objectives.push(objective.textContent);
                });
            }
            
            // Collect tasks
            const tasksSection = domainSection.querySelector('.tasks-section');
            if (tasksSection) {
                const taskItems = tasksSection.querySelectorAll('.list-group-item');
                taskItems.forEach(taskItem => {
                    const taskText = taskItem.querySelector('.editable').textContent;
                    const isCompleted = taskItem.querySelector('input[type="checkbox"]').checked;
                    
                    domain.tasks.push({
                        text: taskText,
                        completed: isCompleted
                    });
                });
            }
            
            planData.domains.push(domain);
        });
        
        return planData;
    }
    
    // Function to export the case plan to PDF
    // Assign exportToPDF to the global variable we defined at the top
    exportToPDF = function() {
        // Show a loading message
        showAlert('Preparing PDF...', 'info');
        
        const planContent = document.getElementById('plan-content');
        
        // Handle client name retrieval from any page format
        let clientName = 'Client';
        // Check from form input (create page)
        const clientNameInput = document.getElementById('client-name');
        if (clientNameInput && clientNameInput.value) {
            clientName = clientNameInput.value;
        } else {
            // Check client name from dashboard form (index page)
            const clientNameField = document.getElementById('client_name');
            if (clientNameField && clientNameField.value) {
                clientName = clientNameField.value;
            } else {
                // Check from view page format (view_plan page)
                const clientInfoText = document.querySelector('p.text-muted');
                if (clientInfoText && clientInfoText.textContent.includes('Client:')) {
                    const clientMatch = clientInfoText.textContent.match(/Client:\s*([^|]+)/);
                    if (clientMatch && clientMatch[1]) {
                        clientName = clientMatch[1].trim();
                    }
                } else {
                    // Check from edit page input field (edit_plan page)
                    const editClientName = document.getElementById('clientName');
                    if (editClientName && editClientName.value) {
                        clientName = editClientName.value;
                    }
                }
            }
        }
        
        // Handle plan title retrieval from any page format
        let planTitle = 'Case Plan';
        // Check from plan-content h2 (create page)
        const planContentTitle = document.querySelector('#plan-content h2');
        if (planContentTitle) {
            planTitle = planContentTitle.textContent;
        } else {
            // Check from h1.mb-1 (view_plan page)
            const viewTitle = document.querySelector('h1.mb-1');
            if (viewTitle) {
                planTitle = viewTitle.textContent;
            } else {
                // Check from plan title field (index page)
                const planTitleField = document.getElementById('plan_title');
                if (planTitleField && planTitleField.value) {
                    planTitle = planTitleField.value;
                } else {
                    // Check from edit page input field (edit_plan page)
                    const editPlanTitle = document.getElementById('planTitle');
                    if (editPlanTitle && editPlanTitle.value) {
                        planTitle = editPlanTitle.value;
                    }
                }
            }
        }
        
        // Get current date
        const currentDate = new Date().toLocaleDateString();
        
        const fileName = `${planTitle.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}.pdf`;
        
        // Create a clean simplified div for PDF export
        const tempDiv = document.createElement('div');
        tempDiv.className = 'pdf-export-container';
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = '#fff';
        tempDiv.style.color = '#000';
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px'; // Fixed width for more consistent results
        tempDiv.style.fontFamily = 'Arial, Helvetica, sans-serif';
        
        // Create header with title, client name, and date - center-aligned and larger text
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.marginBottom = '25px';
        header.innerHTML = `
            <h1 style="font-size: 28px; margin-bottom: 20px; font-weight: bold;">${planTitle}</h1>
            <p style="margin-bottom: 8px; font-size: 18px;"><strong>Client Name:</strong> ${clientName}</p>
            <p style="margin-bottom: 25px; font-size: 18px;"><strong>Date:</strong> ${currentDate}</p>
            <hr style="margin-bottom: 30px; border: none; border-top: 1px solid #000;">
        `;
        tempDiv.appendChild(header);
        
        // Create a clean container for domains
        const domainContainer = document.createElement('div');
        
        // Get all domains from any plan structure (view_plan, edit_plan, or landing page)
        // First try the standard selector from the landing page
        let renderedDomains = document.querySelectorAll('.domain-section');
        
        // If no domains found, try the view_plan page format
        if (!renderedDomains.length) {
            // In view_plan page, domains might be in #plan-container
            const planContainer = document.getElementById('plan-container');
            if (planContainer) {
                renderedDomains = planContainer.querySelectorAll('.card');
            }
        }
        
        // Process each domain
        renderedDomains.forEach(originalDomain => {
            const domainEl = document.createElement('div');
            domainEl.style.marginBottom = '30px';
            
            // Get domain name and risk level
            let domainName, riskLevel;
            
            // Try formats from different pages
            
            // Format from main page (domain-section with h3)
            const domainTitle = originalDomain.querySelector('h3, .card-header');
            if (domainTitle) {
                domainName = domainTitle.textContent.trim();
                
                // Clean up domain title if it contains risk level (view_plan format)
                if (domainName.includes('(') && domainName.includes(')')) {
                    const parts = domainName.split('(');
                    domainName = parts[0].trim();
                    riskLevel = parts[1].replace(')', '').trim();
                } else {
                    // Try to get risk level from badge
                    const badge = originalDomain.querySelector('.badge');
                    riskLevel = badge ? badge.textContent.trim() : '';
                }
            } else {
                domainName = 'Domain';
                riskLevel = '';
            }
            
            // Create domain header
            domainEl.innerHTML = `
                <h2 style="font-size: 20px; margin-bottom: 10px; font-weight: bold;">${domainName} <span style="font-size: 16px; font-weight: normal;">(${riskLevel})</span></h2>
            `;
            
            // Process goals if present
            let goalsSection = originalDomain.querySelector('.goals-section');
            let goals = [];
            
            // Different formats for goals depending on the page
            if (goalsSection) {
                // Main page format
                goals = goalsSection.querySelectorAll('.list-group-item .editable');
            } else {
                // View_plan format - look for headers and lists
                const headers = originalDomain.querySelectorAll('h5, .card-title');
                
                headers.forEach(header => {
                    if (header.textContent.toLowerCase().includes('goal')) {
                        // Get the next list if it exists
                        let nextElement = header.nextElementSibling;
                        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
                            goals = nextElement.querySelectorAll('li');
                        }
                    }
                });
            }
            
            if (goals.length > 0) {
                const goalsTitle = document.createElement('h3');
                goalsTitle.textContent = 'Goals';
                goalsTitle.style.fontSize = '16px';
                goalsTitle.style.marginTop = '15px';
                goalsTitle.style.marginBottom = '10px';
                goalsTitle.style.fontWeight = 'bold';
                domainEl.appendChild(goalsTitle);
                
                const goalsList = document.createElement('ul');
                goalsList.style.listStyleType = 'disc';
                goalsList.style.paddingLeft = '20px';
                goalsList.style.marginBottom = '15px';
                
                goals.forEach(goal => {
                    const listItem = document.createElement('li');
                    listItem.textContent = goal.textContent;
                    listItem.style.marginBottom = '5px';
                    goalsList.appendChild(listItem);
                });
                
                domainEl.appendChild(goalsList);
            }
            
            // Process objectives if present
            let objectivesSection = originalDomain.querySelector('.objectives-section');
            let objectives = [];
            
            // Different formats for objectives depending on the page
            if (objectivesSection) {
                // Main page format
                objectives = objectivesSection.querySelectorAll('.list-group-item .editable');
            } else {
                // View_plan format - look for headers and lists
                const headers = originalDomain.querySelectorAll('h5, .card-title');
                
                headers.forEach(header => {
                    if (header.textContent.toLowerCase().includes('objective')) {
                        // Get the next list if it exists
                        let nextElement = header.nextElementSibling;
                        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
                            objectives = nextElement.querySelectorAll('li');
                        }
                    }
                });
            }
            
            if (objectives.length > 0) {
                const objectivesTitle = document.createElement('h3');
                objectivesTitle.textContent = 'Objectives';
                objectivesTitle.style.fontSize = '16px';
                objectivesTitle.style.marginTop = '15px';
                objectivesTitle.style.marginBottom = '10px';
                objectivesTitle.style.fontWeight = 'bold';
                domainEl.appendChild(objectivesTitle);
                
                const objectivesList = document.createElement('ul');
                objectivesList.style.listStyleType = 'disc';
                objectivesList.style.paddingLeft = '20px';
                objectivesList.style.marginBottom = '15px';
                
                objectives.forEach(objective => {
                    const listItem = document.createElement('li');
                    listItem.textContent = objective.textContent;
                    listItem.style.marginBottom = '5px';
                    objectivesList.appendChild(listItem);
                });
                
                domainEl.appendChild(objectivesList);
            }
            
            // Process tasks if present
            let tasksSection = originalDomain.querySelector('.tasks-section');
            let taskItems = [];
            
            // Different formats for tasks depending on the page
            if (tasksSection) {
                // Main page format
                taskItems = tasksSection.querySelectorAll('.list-group-item');
            } else {
                // View_plan format - look for headers and lists
                const headers = originalDomain.querySelectorAll('h5, .card-title');
                
                headers.forEach(header => {
                    if (header.textContent.toLowerCase().includes('task')) {
                        // Get the next list if it exists
                        let nextElement = header.nextElementSibling;
                        if (nextElement && (nextElement.tagName === 'UL' || nextElement.tagName === 'OL')) {
                            taskItems = nextElement.querySelectorAll('li');
                        }
                    }
                });
            }
            
            if (taskItems.length > 0) {
                const tasksTitle = document.createElement('h3');
                tasksTitle.textContent = 'Tasks';
                tasksTitle.style.fontSize = '16px';
                tasksTitle.style.marginTop = '15px';
                tasksTitle.style.marginBottom = '10px';
                tasksTitle.style.fontWeight = 'bold';
                domainEl.appendChild(tasksTitle);
                
                const tasksList = document.createElement('ul');
                tasksList.style.listStyleType = 'none';
                tasksList.style.paddingLeft = '5px';
                tasksList.style.marginBottom = '15px';
                
                taskItems.forEach(taskItem => {
                    const listItem = document.createElement('li');
                    // Handle different formats of tasks
                    let taskText = '';
                    let isChecked = false;
                    
                    // Check for checkbox in main page format
                    const checkbox = taskItem.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        isChecked = checkbox.checked;
                    } else {
                        // Check for completed status in view_plan format
                        isChecked = taskItem.textContent.toLowerCase().includes('(completed)');
                    }
                    
                    // Get task text from different formats
                    const taskTextElement = taskItem.querySelector('.editable');
                    if (taskTextElement) {
                        // Main page format
                        taskText = taskTextElement.textContent.trim();
                    } else {
                        // View_plan format
                        taskText = taskItem.textContent.trim()
                            .replace('(Completed)', '')
                            .replace('(Not Completed)', '')
                            .trim();
                    }
                    
                    // Handle tasks stored as JSON objects
                    if (taskText.startsWith('{') && taskText.includes('text')) {
                        try {
                            const taskObj = JSON.parse(taskText.replace(/'/g, '"'));
                            if (taskObj && taskObj.text) {
                                taskText = taskObj.text;
                            }
                        } catch (e) {
                            // Keep the original text if parsing fails
                        }
                    }
                    
                    listItem.innerHTML = isChecked 
                        ? `<span style="margin-right: 10px;">✓</span>${taskText}`
                        : `<span style="margin-right: 10px;">☐</span>${taskText}`;
                    
                    listItem.style.marginBottom = '5px';
                    tasksList.appendChild(listItem);
                });
                
                domainEl.appendChild(tasksList);
            }
            
            domainContainer.appendChild(domainEl);
        });
        
        tempDiv.appendChild(domainContainer);
        
        // Add signature blocks at the end
        const signatureSection = document.createElement('div');
        signatureSection.style.marginTop = '30px';
        signatureSection.style.pageBreakInside = 'avoid';
        signatureSection.innerHTML = `
            <h3 style="margin-top: 50px; margin-bottom: 20px; font-size: 18px; font-weight: bold;">Agreement Signatures</h3>
            <div style="display: flex; justify-content: space-between;">
                <div style="width: 45%;">
                    <div style="border-bottom: 1px solid #000; height: 40px;"></div>
                    <p style="margin-top: 5px; font-weight: bold;">Client Signature</p>
                    <div style="border-bottom: 1px solid #000; height: 40px; margin-top: 20px;"></div>
                    <p style="margin-top: 5px; font-weight: bold;">Date</p>
                </div>
                <div style="width: 45%;">
                    <div style="border-bottom: 1px solid #000; height: 40px;"></div>
                    <p style="margin-top: 5px; font-weight: bold;">Probation Officer Signature</p>
                    <div style="border-bottom: 1px solid #000; height: 40px; margin-top: 20px;"></div>
                    <p style="margin-top: 5px; font-weight: bold;">Date</p>
                </div>
            </div>
        `;
        tempDiv.appendChild(signatureSection);
        
        // Append to body temporarily
        document.body.appendChild(tempDiv);
        
        // Use html2canvas and jsPDF to generate the PDF
        html2canvas(tempDiv, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            try {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const imgProps = pdf.getImageProperties(imgData);
                const marginX = 20; // Left and right margin in mm
                const marginY = 20; // Top and bottom margin in mm
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                const usableWidth = pageWidth - (2 * marginX);
                const usableHeight = pageHeight - (2 * marginY);
                
                const pdfHeight = (imgProps.height * usableWidth) / imgProps.width;

                // If content fits on a single page
                if (pdfHeight <= usableHeight) {
                    pdf.addImage(imgData, 'PNG', marginX, marginY, usableWidth, pdfHeight);
                } else {
                    let position = marginY;
                    let heightLeft = pdfHeight;

                    // Add first page
                    pdf.addImage(imgData, 'PNG', marginX, position, usableWidth, pdfHeight);
                    heightLeft -= usableHeight;

                    // Add additional pages
                    while (heightLeft > 0) {
                        pdf.addPage();
                        position -= pageHeight;
                        pdf.addImage(imgData, 'PNG', 0, position + marginY, pdfWidth, pdfHeight);
                        heightLeft -= usablePageHeight;
                    }
                }
                
                pdf.save(fileName);
                showAlert('PDF has been downloaded.', 'success');
            } catch (error) {
                console.error('Error in PDF generation:', error);
                showAlert('Error creating PDF. Please try again.', 'danger');
            } finally {
                // Remove the temporary element
                document.body.removeChild(tempDiv);
            }
        }).catch(err => {
            console.error('Error generating PDF:', err);
            document.body.removeChild(tempDiv);
            showAlert('Error generating PDF. Please try again.', 'danger');
        });
    }
    
    // Function to show an alert message
    function showAlert(message, type = 'info') {
        const alertsContainer = document.getElementById('alerts-container');
        
        if (!alertsContainer) return;
        
        const alert = document.createElement('div');
        alert.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show');
        alert.setAttribute('role', 'alert');
        
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertsContainer.appendChild(alert);
        
        // Remove the alert after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alertsContainer.removeChild(alert);
                    }
                }, 150);
            }
        }, 5000);
    }
});
