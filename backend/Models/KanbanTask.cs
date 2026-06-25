namespace backend.Models
{
    public class KanbanTask
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "todo"; // todo, in_progress, review, done
        public int? AssignedTo { get; set; }
        public User? AssignedUser { get; set; }
        public string Priority { get; set; } = "medium"; // low, medium, high
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
