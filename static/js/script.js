// Define global functions
let exportToPDF;
let showAlert;

document.addEventListener('DOMContentLoaded', function() {
    // Function to show an alert message
    showAlert = function(message, type = 'info') {
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
    };

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
    exportToPDF = function() {
        showAlert('Preparing PDF...', 'info');

        // Get client name and plan title
        let clientName = document.querySelector('#client-name')?.value || 
                        document.querySelector('p.text-muted')?.textContent.match(/Client:\s*([^|]+)/)?.[ 1]?.trim() || 
                        'Client';
        let planTitle = document.querySelector('h1.mb-1')?.textContent || 
                       document.querySelector('#plan-content h2')?.textContent || 
                       'Case Plan';
        const currentDate = new Date().toLocaleDateString();

        // Create new PDF document
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set font and size
        pdf.setFont('helvetica');
        pdf.setFontSize(12);

        // Define margins (in mm)
        const margin = 25;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const textWidth = pageWidth - (2 * margin);

        // Start position
        let yPos = margin;

        // Center align header
        pdf.setFontSize(16);
        pdf.text(planTitle, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        pdf.setFontSize(12);
        pdf.text(clientName, pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
        pdf.text(currentDate, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Add line break
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // Get domains data
        const domainsToExport = document.querySelectorAll('.domain-section');
        domainsToExport.forEach(domain => {
            const domainName = domain.querySelector('h3')?.textContent || '';
            const riskLevel = domain.querySelector('.badge')?.textContent || '';

            pdf.setFontSize(14);
            pdf.text(`${domainName} - ${riskLevel}`, margin, yPos);
            yPos += 10;

            pdf.setFontSize(12);

            // Goals
            const goals = Array.from(domain.querySelectorAll('.goals-section .editable, .goals-section .editable-text')).map(g => g.textContent);
            if (goals.length) {
                pdf.text('Goals:', margin, yPos);
                yPos += 7;
                goals.forEach(goal => {
                    const lines = pdf.splitTextToSize(`• ${goal}`, textWidth);
                    lines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            pdf.addPage();
                            yPos = margin;
                        }
                        pdf.text(line, margin, yPos);
                        yPos += 7;
                    });
                });
                yPos += 5;
            }

            // Objectives
            const objectives = Array.from(domain.querySelectorAll('.objectives-section .editable, .objectives-section .editable-text')).map(o => o.textContent);
            if (objectives.length) {
                pdf.text('Objectives:', margin, yPos);
                yPos += 7;
                objectives.forEach(objective => {
                    const lines = pdf.splitTextToSize(`• ${objective}`, textWidth);
                    lines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            pdf.addPage();
                            yPos = margin;
                        }
                        pdf.text(line, margin, yPos);
                        yPos += 7;
                    });
                });
                yPos += 5;
            }

            // Tasks
            const tasks = Array.from(domain.querySelectorAll('.tasks-section .editable, .tasks-section .editable-text')).map(t => t.textContent);
            if (tasks.length) {
                pdf.text('Tasks:', margin, yPos);
                yPos += 7;
                tasks.forEach(task => {
                    const lines = pdf.splitTextToSize(`• ${task}`, textWidth);
                    lines.forEach(line => {
                        if (yPos > pageHeight - margin) {
                            pdf.addPage();
                            yPos = margin;
                        }
                        pdf.text(line, margin, yPos);
                        yPos += 7;
                    });
                });
                yPos += 10;
            }

            if (yPos > pageHeight - margin) {
                pdf.addPage();
                yPos = margin;
            }
        });

            if (yPos > pageHeight - margin) {
                pdf.addPage();
                yPos = margin;
            }
        });

        // Add signature blocks
        yPos += 20;

        // Draw lines for signatures
        const signatureWidth = 70;
        const leftSignatureX = margin;
        const rightSignatureX = pageWidth - margin - signatureWidth;

        // Add signature lines and labels
        pdf.line(leftSignatureX, yPos, leftSignatureX + signatureWidth, yPos);
        pdf.line(rightSignatureX, yPos, rightSignatureX + signatureWidth, yPos);

        yPos += 5;
        pdf.setFontSize(10);

        // Add participant signature block
        pdf.text(clientName, leftSignatureX, yPos);
        pdf.text("Participant", leftSignatureX, yPos + 5);
        pdf.text(new Date().toLocaleDateString(), leftSignatureX, yPos + 10);

        // Add probation officer signature block
        pdf.text("", rightSignatureX, yPos);
        pdf.text("Probation Officer", rightSignatureX, yPos + 5);
        pdf.text(new Date().toLocaleDateString(), rightSignatureX, yPos + 10);

        // Save the PDF
        const fileName = `${planTitle.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}.pdf`;
        pdf.save(fileName);
        showAlert('PDF has been downloaded.', 'success');
    };
});