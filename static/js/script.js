document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const generateBtn = document.getElementById('generate-plan-btn');
    const riskForm = document.getElementById('risk-form');
    const planContainer = document.getElementById('plan-container');
    const exportBtn = document.getElementById('export-btn');
    const printBtn = document.getElementById('print-btn');

    // Hide the plan container and export buttons initially
    planContainer.classList.add('d-none');
    
    // Handle form submission to generate a case plan
    if (riskForm) {
        riskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading spinner
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            generateBtn.disabled = true;
            
            // Get form data
            const formData = new FormData(riskForm);
            
            // Send request to server
            fetch('/generate_plan', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showAlert('Error: ' + data.error, 'danger');
                } else {
                    displayCasePlan(data);
                    planContainer.classList.remove('d-none');
                    document.getElementById('export-controls').classList.remove('d-none');
                    
                    // Scroll to the plan container
                    planContainer.scrollIntoView({ behavior: 'smooth' });
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
                                <div class="editable" contenteditable="true">${goal}</div>
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
                                <div class="editable" contenteditable="true">${objective}</div>
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
                        ${domain.tasks.map(task => `
                            <li class="list-group-item">
                                <div class="d-flex align-items-center">
                                    <input class="form-check-input me-3" type="checkbox">
                                    <div class="editable" contenteditable="true">${task}</div>
                                </div>
                            </li>
                        `).join('')}
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
                <div class="d-flex align-items-center">
                    <input class="form-check-input me-3" type="checkbox">
                    <div class="editable" contenteditable="true">New task</div>
                </div>
            `;
        } else {
            newItem.innerHTML = `
                <div class="editable" contenteditable="true">New ${itemType}</div>
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
    
    // Function to export the case plan to PDF
    function exportToPDF() {
        // Show a loading message
        showAlert('Preparing PDF...', 'info');
        
        const planContent = document.getElementById('plan-content');
        
        // Get client name - handle both formats (initial generation and view page)
        let clientName = 'Client';
        const clientNameInput = document.getElementById('client-name');
        if (clientNameInput && clientNameInput.value) {
            clientName = clientNameInput.value;
        } else {
            // Try to find it in the plan view format
            const clientInfoText = document.querySelector('p.text-muted');
            if (clientInfoText && clientInfoText.textContent.includes('Client:')) {
                const clientMatch = clientInfoText.textContent.match(/Client:\s*([^|]+)/);
                if (clientMatch && clientMatch[1]) {
                    clientName = clientMatch[1].trim();
                }
            }
        }
        
        // Get plan title - handle both formats
        let planTitle = 'Case_Plan';
        const planTitleElement = document.querySelector('#plan-content h2, h1.mb-1');
        if (planTitleElement) {
            planTitle = planTitleElement.textContent;
        }
        
        const fileName = `${planTitle.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}.pdf`;
        
        // For view_plan.html, use the plan-container instead of plan-content
        let contentToCapture = planContent;
        const planContainer = document.getElementById('plan-container');
        if (planContainer && !planContainer.classList.contains('d-none')) {
            contentToCapture = planContainer;
        }
        
        // Create a simplified version of the content for PDF export
        const tempDiv = document.createElement('div');
        tempDiv.className = 'pdf-export-container';
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = '#fff';
        tempDiv.style.color = '#000';
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px'; // Fixed width for more consistent results
        
        // Clone the content
        tempDiv.innerHTML = contentToCapture.innerHTML;
        
        // Remove interactive elements
        const elementsToRemove = tempDiv.querySelectorAll('.add-item-section, .btn-group, .no-print');
        elementsToRemove.forEach(el => el.remove());
        
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
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                
                // If the content is longer than a page, add more pages
                if (pdfHeight > pdf.internal.pageSize.getHeight()) {
                    let remainingHeight = pdfHeight;
                    let position = -pdf.internal.pageSize.getHeight();
                    
                    while (remainingHeight > 0) {
                        position += pdf.internal.pageSize.getHeight();
                        remainingHeight -= pdf.internal.pageSize.getHeight();
                        
                        if (remainingHeight > 0) {
                            pdf.addPage();
                            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                        }
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
