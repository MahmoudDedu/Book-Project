/* --- General styles for the book viewer --- */
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const documentContent = document.getElementById('documentContent');
        const searchResultsDiv = document.getElementById('searchResults');

        // Store the original content to restore it after clearing highlights
        let originalContent = documentContent.innerHTML;
        let highlightedElements = []; // To store references to all highlighted spans
        let currentHighlightIndex = -1; // To track the currently active highlight

        // Function to remove all current highlight and current-highlight classes
        function clearHighlights() {
            const allHighlights = documentContent.querySelectorAll('.highlight, .current-highlight');
            allHighlights.forEach(span => {
                // If it's a regular highlight, remove span and restore text
                if (!span.classList.contains('ocr-suspicious')) { // Don't remove OCR suspicious highlights
                    const parent = span.parentNode;
                    parent.replaceChild(document.createTextNode(span.textContent), span);
                    parent.normalize(); // Clean up merged text nodes
                } else {
                    // For OCR suspicious, just remove current-highlight class
                    span.classList.remove('current-highlight');
                }
            });
            // Re-apply original content for a clean slate before searching
            documentContent.innerHTML = originalContent;
            highlightedElements = []; // Clear the array
            currentHighlightIndex = -1; // Reset index
        }


        searchButton.addEventListener('click', function() {
            performSearch(true); // true indicates initial search
        });

        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                if (highlightedElements.length > 0) {
                    goToNextHighlight(); // If results exist, go to next
                } else {
                    performSearch(true); // Otherwise, perform initial search
                }
            }
        });

        function performSearch(isInitialSearch = false) {
            const searchTerm = searchInput.value.trim();

            // Always clear highlights and restore original content for a fresh search
            clearHighlights();
            searchResultsDiv.textContent = '';

            if (searchTerm === '') {
                searchResultsDiv.textContent = 'الرجاء إدخال كلمة للبحث.';
                return;
            }

            const regex = new RegExp(searchTerm, 'gi'); // 'g' for global, 'i' for case-insensitive

            let matches = 0;
            // Need to work on a clone of the document content to avoid modifying the live DOM during text node replacement
            // and messing up subsequent searches.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalContent; // Start with the clean original content

            // Function to highlight text nodes recursively
            function highlightTextNodes(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    // Check if the text node is not inside a script or style tag, or inside an existing highlight/ocr-suspicious span
                    if (node.parentNode.tagName !== 'SCRIPT' && node.parentNode.tagName !== 'STYLE' &&
                        !node.parentNode.classList.contains('highlight') && !node.parentNode.classList.contains('ocr-suspicious')) {
                        const text = node.nodeValue;
                        if (regex.test(text)) {
                            regex.lastIndex = 0; // Reset regex for multiple matches in same text node
                            const replacedHtml = text.replace(regex, (match) => {
                                matches++;
                                return `<span class="highlight">${match}</span>`;
                            });
                            // Create a temporary div to parse the HTML string and then replace the text node
                            const tempSpanContainer = document.createElement('span'); // Use span for inline replacement
                            tempSpanContainer.innerHTML = replacedHtml;

                            // Replace the original text node with the new parsed HTML
                            while (tempSpanContainer.firstChild) {
                                node.parentNode.insertBefore(tempSpanContainer.firstChild, node);
                            }
                            node.parentNode.removeChild(node); // Remove the original text node
                        }
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // Only recurse if the element is not already a highlight or ocr-suspicious span
                    if (!node.classList.contains('highlight') && !node.classList.contains('ocr-suspicious')) {
                        for (let i = 0; i < node.childNodes.length; i++) {
                            highlightTextNodes(node.childNodes[i]);
                        }
                    }
                }
            }

            highlightTextNodes(tempDiv); // Start highlighting on the temporary div

            // Update the live DOM with the modified content
            documentContent.innerHTML = tempDiv.innerHTML;

            // Now, get all the highlighted elements from the live DOM
            highlightedElements = Array.from(documentContent.querySelectorAll('.highlight'));


            if (matches > 0) {
                searchResultsDiv.textContent = `تم العثور على ${matches} نتيجة.`;
                currentHighlightIndex = -1; // Reset to -1 so goToNextHighlight() starts from 0
                if (isInitialSearch) {
                    goToNextHighlight(); // Go to the first result immediately after initial search
                }
            } else {
                searchResultsDiv.textContent = `لم يتم العثور على نتائج لـ "${searchTerm}".`;
            }
        }

        function goToNextHighlight() {
            if (highlightedElements.length === 0) {
                searchResultsDiv.textContent = 'لا توجد نتائج للبحث.';
                return;
            }

            // Remove current-highlight class from the previously active element, if any
            if (currentHighlightIndex !== -1) {
                highlightedElements[currentHighlightIndex].classList.remove('current-highlight');
            }

            // Move to the next highlight, wrap around if at the end
            currentHighlightIndex = (currentHighlightIndex + 1) % highlightedElements.length;

            const nextHighlight = highlightedElements[currentHighlightIndex];
            nextHighlight.classList.add('current-highlight'); // Add current-highlight to the new active element

            // Scroll to the next highlight
            nextHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

            searchResultsDiv.textContent = `النتيجة ${currentHighlightIndex + 1} من ${highlightedElements.length}.`;
        }
