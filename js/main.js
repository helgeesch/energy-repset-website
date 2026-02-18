document.addEventListener('DOMContentLoaded', () => {
    // --- Smooth scrolling for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Python syntax highlighter ---
    function highlightPython(code) {
        let html = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const comments = [];
        html = html.replace(/(#.*$)/gm, (match) => {
            comments.push(match);
            return `###COMMENT_${comments.length - 1}###`;
        });

        const strings = [];
        html = html.replace(/("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|("""[\s\S]*?""")|('''[\s\S]*?''')/g, (match) => {
            strings.push(match);
            return `###STRING_${strings.length - 1}###`;
        });

        html = html.replace(/^(\s*)(@\w+)/gm, '$1<span class="decorator">$2</span>');
        html = html.replace(/\b(from|import|def|class|return|as|for|in|if|else|elif|while|try|except|finally|with|is|not|and|or|pass|break|continue|lambda|yield|True|False|None)\b/g,
            '<span class="keyword">$&</span>');
        html = html.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="function">$1</span>');
        html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$&</span>');

        html = html.replace(/###STRING_(\d+)###/g, (_, i) => `<span class="string">${strings[i]}</span>`);
        html = html.replace(/###COMMENT_(\d+)###/g, (_, i) => `<span class="comment">${comments[i]}</span>`);

        return html;
    }

    // --- Typewriter engine (adapted from mesqual-website) ---
    let typewriterAnimId = null;

    function cancelTypewriter() {
        if (typewriterAnimId) {
            cancelAnimationFrame(typewriterAnimId);
            typewriterAnimId = null;
        }
    }

    function typewriteHTML(element, html, duration) {
        if (duration === undefined) duration = 500;
        cancelTypewriter();

        // Set full content first, lock the <pre> parent to its final height,
        // then blank the text nodes for the typewriter reveal.
        element.innerHTML = html;
        const pre = element.closest('pre');
        if (pre) pre.style.height = pre.scrollHeight + 'px';
        element.classList.add('typing');

        const textEntries = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            textEntries.push({ node: node, fullText: node.textContent });
            node.textContent = '';
        }

        const totalChars = textEntries.reduce((sum, e) => sum + e.fullText.length, 0);
        if (totalChars === 0) {
            element.classList.remove('typing');
            return;
        }

        const charDelay = duration / totalChars;
        let startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const target = Math.min(
                Math.floor((timestamp - startTime) / charDelay),
                totalChars
            );

            let charsLeft = target;
            for (let i = 0; i < textEntries.length; i++) {
                const entry = textEntries[i];
                const len = entry.fullText.length;
                if (charsLeft >= len) {
                    entry.node.textContent = entry.fullText;
                    charsLeft -= len;
                } else if (charsLeft > 0) {
                    entry.node.textContent = entry.fullText.substring(0, charsLeft);
                    charsLeft = 0;
                } else {
                    entry.node.textContent = '';
                }
            }

            if (target >= totalChars) {
                element.classList.remove('typing');
                const pre = element.closest('pre');
                if (pre) pre.style.height = '';
                typewriterAnimId = null;
            } else {
                typewriterAnimId = requestAnimationFrame(step);
            }
        }

        typewriterAnimId = requestAnimationFrame(step);
    }

    // --- Quick start code content ---
    const quickstartCode = `import pandas as pd
import energy_repset as rep

# Load hourly time-series data (columns = variables, index = datetime)
df_raw = pd.read_csv("your_data.csv", index_col=0, parse_dates=True)

# Define problem: slice the year into monthly candidate periods
slicer = rep.TimeSlicer(unit="month")
context = rep.ProblemContext(df_raw, slicer)

# Feature engineering: statistical summaries per month
feature_engineer = rep.StandardStatsFeatureEngineer()

# Objective: score each candidate selection on distribution fidelity
objective_set = rep.ObjectiveSet({
    'wasserstein': (1.0, rep.WassersteinFidelity()),
    'correlation': (1.0, rep.CorrelationFidelity()),
})

# Search: evaluate all 4-of-12 monthly combinations
policy = rep.WeightedSumPolicy()
combi_gen = rep.ExhaustiveCombiGen(k=4)
search = rep.ObjectiveDrivenCombinatorialSearchAlgorithm(objective_set, policy, combi_gen)

# Representation: equal 1/k weights per selected month
representation = rep.UniformRepresentationModel()

# Assemble and run
workflow = rep.Workflow(feature_engineer, search, representation)
experiment = rep.RepSetExperiment(context, workflow)
result = experiment.run()

print(result.selection)  # e.g., (Period('2019-01', 'M'), ...)
print(result.weights)    # e.g., {Period('2019-01', 'M'): 3.0, ...}
print(result.scores)     # e.g., {'wasserstein': 0.023, 'correlation': 0.015}`;

    // --- Trigger typewriter when code block scrolls into view ---
    const codeEl = document.getElementById('quickstart-code');
    if (codeEl) {
        const highlightedHTML = highlightPython(quickstartCode);
        let hasTyped = false;

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !hasTyped) {
                    hasTyped = true;
                    typewriteHTML(codeEl, highlightedHTML, 3000);
                    observer.disconnect();
                    break;
                }
            }
        }, { threshold: 0.2 });

        observer.observe(codeEl.closest('.code-block'));
    }
});
