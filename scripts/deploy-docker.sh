#!/bin/bash

# Deploy smar-ai using Docker Compose
# Usage: ./scripts/deploy-docker.sh [start|stop|restart|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default command
COMMAND="${1:-start}"

echo -e "${YELLOW}=== smar-ai Docker Deployment ===${NC}"
echo ""

case "$COMMAND" in
  start)
    echo -e "${YELLOW}Starting smar-ai services...${NC}"

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
      echo -e "${RED}Error: Docker is not running${NC}"
      exit 1
    fi

    # Check if docker-compose.yml exists
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
      echo -e "${RED}Error: docker-compose.yml not found${NC}"
      exit 1
    fi

    # Create .env file if it doesn't exist
    if [ ! -f "$PROJECT_DIR/.env" ]; then
      echo -e "${YELLOW}Creating .env file...${NC}"
      cat > "$PROJECT_DIR/.env" << EOF
# Ollama Configuration
OLLAMA_API_URL=http://ollama:11434/api
OLLAMA_MODEL=deepseek-r1:latest

# GitHub Token (optional)
GITHUB_TOKEN=

# Node Environment
NODE_ENV=production
EOF
      echo -e "${GREEN}.env file created${NC}"
      echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
    fi

    cd "$PROJECT_DIR"
    docker-compose up -d

    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
    echo -e "${GREEN}Access your application:${NC}"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:5050"
    echo "  Ollama:   http://localhost:11434"
    echo ""
    echo -e "${YELLOW}Pull Ollama models (if needed):${NC}"
    echo "  docker exec smar-ai-ollama ollama pull deepseek-r1"
    echo ""
    ;;

  stop)
    echo -e "${YELLOW}Stopping smar-ai services...${NC}"
    cd "$PROJECT_DIR"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
    ;;

  restart)
    echo -e "${YELLOW}Restarting smar-ai services...${NC}"
    cd "$PROJECT_DIR"
    docker-compose restart
    echo -e "${GREEN}✓ Services restarted${NC}"
    ;;

  logs)
    echo -e "${YELLOW}Showing service logs (Ctrl+C to exit)${NC}"
    cd "$PROJECT_DIR"
    docker-compose logs -f
    ;;

  status)
    echo -e "${YELLOW}Service status:${NC}"
    cd "$PROJECT_DIR"
    docker-compose ps
    ;;

  build)
    echo -e "${YELLOW}Building Docker images...${NC}"
    cd "$PROJECT_DIR"
    docker-compose build
    echo -e "${GREEN}✓ Images built${NC}"
    ;;

  clean)
    echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
    cd "$PROJECT_DIR"
    docker-compose down -v
    echo -e "${GREEN}✓ Cleaned up${NC}"
    ;;

  *)
    echo -e "${RED}Unknown command: $COMMAND${NC}"
    echo ""
    echo "Usage: $0 [start|stop|restart|logs|status|build|clean]"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services (default)"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  logs    - Show service logs"
    echo "  status  - Show service status"
    echo "  build   - Build Docker images"
    echo "  clean   - Remove all containers and volumes"
    exit 1
    ;;
esac

exit 0
