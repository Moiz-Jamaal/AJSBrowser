// Remote Control Client - Polls for and executes remote commands
// This runs in the student browser and executes admin commands

(async function() {
    const API_URL = 'https://5wgk4koei8.execute-api.us-east-1.amazonaws.com/prod';
    let pollingInterval = null;
    
    console.log('🎮 Remote Control Client initialized');

    // Start polling for commands
    function startCommandPolling() {
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            console.log('⚠️ No session ID found, remote control disabled');
            return;
        }

        console.log(`🎮 Starting remote control polling for session: ${sessionId}`);

        // Poll every 2 seconds
        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/api/remote-control/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.commands && data.commands.length > 0) {
                        for (const command of data.commands) {
                            await executeCommand(command);
                        }
                    }
                }
            } catch (error) {
                // Silent fail - don't spam console
            }
        }, 2000); // Poll every 2 seconds
    }

    // Execute a remote command
    async function executeCommand(command) {
        console.log(`🎮 Executing remote command: ${command.command_type}`, command);

        let result = { success: false };

        try {
            switch (command.command_type) {
                case 'mouse_click':
                    result = await window.electronAPI.simulateMouseClick(
                        command.command_data.x,
                        command.command_data.y,
                        command.command_data.button || 'left'
                    );
                    break;

                case 'mouse_move':
                    result = await window.electronAPI.simulateMouseMove(
                        command.command_data.x,
                        command.command_data.y
                    );
                    break;

                case 'key_press':
                    result = await window.electronAPI.simulateKeyPress(
                        command.command_data.key,
                        command.command_data.modifiers
                    );
                    break;

                case 'type_text':
                    // Type text character by character
                    const text = command.command_data.text || '';
                    for (const char of text) {
                        await window.electronAPI.simulateKeyPress(char, []);
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    result = { success: true };
                    break;

                case 'execute_command':
                    result = await window.electronAPI.executeRemoteCommand(
                        command.command_data.command
                    );
                    break;

                default:
                    console.warn(`Unknown command type: ${command.command_type}`);
                    result = { success: false, error: 'Unknown command type' };
            }

            // Report command result back to server
            await reportCommandResult(command.id, 'completed', result);

        } catch (error) {
            console.error('Error executing command:', error);
            await reportCommandResult(command.id, 'failed', { error: error.message });
        }
    }

    // Report command execution result
    async function reportCommandResult(commandId, status, result) {
        try {
            const sessionId = localStorage.getItem('sessionId');
            await fetch(`${API_URL}/api/remote-control/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    commandId,
                    status,
                    result
                })
            });
        } catch (error) {
            console.error('Failed to report command result:', error);
        }
    }

    // Start polling when session is created
    const checkSession = setInterval(() => {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && !pollingInterval) {
            startCommandPolling();
            clearInterval(checkSession);
        }
    }, 1000);

    // Stop polling on page unload
    window.addEventListener('beforeunload', () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
    });

    console.log('✅ Remote control client ready');
})();
