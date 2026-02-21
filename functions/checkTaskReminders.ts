/**
 * Scheduled function that runs daily to check for tasks that need reminders
 * Schedule: Daily at 8:00 AM
 */
export default async function checkTaskReminders() {
  const { base44 } = await import('@base44/sdk/backend');
  
  // Get current date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Get all active tasks with reminder dates
  const tasks = await base44.entities.Task.list();
  
  const tasksToRemind = tasks.filter(task => {
    // Skip completed or cancelled tasks
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    
    // Skip if reminder already sent
    if (task.reminder_sent) return false;
    
    // Skip if no reminder date set
    if (!task.reminder_date) return false;
    
    // Check if reminder date is today or in the past
    const reminderDate = new Date(task.reminder_date).toISOString().split('T')[0];
    return reminderDate <= todayStr;
  });
  
  console.log(`Found ${tasksToRemind.length} tasks needing reminders`);
  
  // Send reminders
  const results = [];
  for (const task of tasksToRemind) {
    try {
      // Get assigned member
      const members = await base44.entities.TeamMember.filter({ id: task.assigned_to });
      const member = members[0];
      
      // Send email and create in-app notification
      const result = await base44.functions.sendTaskReminder({ 
        task_id: task.id,
        send_whatsapp: true 
      });
      
      // Create in-app notification
      if (member?.email) {
        await base44.entities.Notification.create({
          user_email: member.email,
          title: 'تذكير بمهمة',
          message: `تذكير: ${task.title} - تاريخ الاستحقاق: ${task.due_date || 'غير محدد'}`,
          type: task.due_date && new Date(task.due_date) < new Date() ? 'task_overdue' : 'task_due',
          related_id: task.id,
          is_read: false
        });
      }
      
      results.push({ task_id: task.id, ...result });
    } catch (error) {
      results.push({ task_id: task.id, success: false, error: error.message });
    }
  }
  
  return {
    total_checked: tasks.length,
    reminders_sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}